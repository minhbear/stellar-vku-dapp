#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::Address as _,
    token::{StellarAssetClient, TokenClient},
    Env, String,
};

struct Trip<'a> {
    env: Env,
    client: ShareBillClient<'a>,
    token: TokenClient<'a>,
    token_address: Address,
    alice: Address,
    bob: Address,
    carol: Address,
    vendor: Address,
}

fn setup() -> Trip<'static> {
    let env = Env::default();
    env.mock_all_auths();

    let issuer = Address::generate(&env);
    let asset = env.register_stellar_asset_contract_v2(issuer);
    let token_address = asset.address();

    let alice = Address::generate(&env);
    let bob = Address::generate(&env);
    let carol = Address::generate(&env);
    let vendor = Address::generate(&env);

    let minter = StellarAssetClient::new(&env, &token_address);
    for who in [&alice, &bob, &carol] {
        minter.mint(who, &1_000);
    }

    let contract_id = env.register(ShareBill, ());
    Trip {
        client: ShareBillClient::new(&env, &contract_id),
        token: TokenClient::new(&env, &token_address),
        token_address,
        alice,
        bob,
        carol,
        vendor,
        env,
    }
}

fn open_trip(t: &Trip) -> u32 {
    t.client.create_pot(
        &t.alice,
        &String::from_str(&t.env, "Da Nang 3 ngay"),
        &t.token_address,
    )
}

#[test]
fn full_trip_settles_to_an_equal_split() {
    let t = setup();
    let pot = open_trip(&t);

    t.client.join(&pot, &t.bob);
    t.client.join(&pot, &t.carol);

    t.client.contribute(&pot, &t.alice, &300);
    t.client.contribute(&pot, &t.bob, &200);
    t.client.contribute(&pot, &t.carol, &100);
    assert_eq!(t.client.balance(&pot), 600);

    // Alice asks, Bob agrees: 2 of 3 is more than half, so it pays out.
    let request = t
        .client
        .request_spend(&pot, &t.alice, &t.vendor, &450, &String::from_str(&t.env, "Khach san"));
    t.client.approve(&pot, &request, &t.bob);

    assert_eq!(t.token.balance(&t.vendor), 450);
    assert_eq!(t.client.balance(&pot), 150);

    t.client.start_settle(&pot, &t.alice);
    assert_eq!(t.client.get_pot(&pot).share, 150);

    // (paid, debt, credit)
    assert_eq!(t.client.position(&pot, &t.alice), (300, 0, 150));
    assert_eq!(t.client.position(&pot, &t.bob), (200, 0, 50));
    assert_eq!(t.client.position(&pot, &t.carol), (100, 50, 0));

    t.client.settle_debt(&pot, &t.carol);
    t.client.finalize(&pot, &t.alice);

    // Everybody ends up having paid exactly 150.
    assert_eq!(t.token.balance(&t.alice), 850);
    assert_eq!(t.token.balance(&t.bob), 850);
    assert_eq!(t.token.balance(&t.carol), 850);
    assert_eq!(t.token.balance(&t.client.address), 0);
    assert_eq!(t.client.get_pot(&pot).status, PotStatus::Closed);
}

#[test]
fn one_vote_of_three_does_not_spend() {
    let t = setup();
    let pot = open_trip(&t);
    t.client.join(&pot, &t.bob);
    t.client.join(&pot, &t.carol);
    t.client.contribute(&pot, &t.alice, &300);

    let request = t
        .client
        .request_spend(&pot, &t.alice, &t.vendor, &100, &String::from_str(&t.env, "Ve xe"));

    assert_eq!(t.token.balance(&t.vendor), 0);
    assert_eq!(t.client.get_requests(&pot).get(0).unwrap().status, RequestStatus::Voting);

    t.client.approve(&pot, &request, &t.carol);
    assert_eq!(t.token.balance(&t.vendor), 100);
}

#[test]
fn a_solo_pot_spends_on_its_own() {
    let t = setup();
    let pot = open_trip(&t);
    t.client.contribute(&pot, &t.alice, &500);
    t.client
        .request_spend(&pot, &t.alice, &t.vendor, &200, &String::from_str(&t.env, "Xe may"));
    assert_eq!(t.token.balance(&t.vendor), 200);
}

#[test]
fn the_creator_carries_the_rounding_remainder() {
    let t = setup();
    let pot = open_trip(&t);
    t.client.join(&pot, &t.bob);
    t.client.join(&pot, &t.carol);
    t.client.contribute(&pot, &t.alice, &100);
    t.client.contribute(&pot, &t.bob, &100);
    t.client.contribute(&pot, &t.carol, &100);

    let request = t
        .client
        .request_spend(&pot, &t.alice, &t.vendor, &100, &String::from_str(&t.env, "An trua"));
    t.client.approve(&pot, &request, &t.bob);
    t.client.start_settle(&pot, &t.alice);

    // 100 over three people: 34 + 33 + 33.
    assert_eq!(t.client.position(&pot, &t.alice).2, 66);
    assert_eq!(t.client.position(&pot, &t.bob).2, 67);
    assert_eq!(t.client.position(&pot, &t.carol).2, 67);

    t.client.finalize(&pot, &t.alice);
    assert_eq!(t.token.balance(&t.client.address), 0);
}

#[test]
fn finalize_waits_for_the_debtors() {
    let t = setup();
    let pot = open_trip(&t);
    t.client.join(&pot, &t.bob);
    t.client.contribute(&pot, &t.alice, &400);

    let request = t
        .client
        .request_spend(&pot, &t.alice, &t.vendor, &400, &String::from_str(&t.env, "Tour"));
    t.client.approve(&pot, &request, &t.bob);
    t.client.start_settle(&pot, &t.alice);

    assert_eq!(
        t.client.try_finalize(&pot, &t.alice),
        Err(Ok(Error::DebtsOutstanding))
    );
    t.client.settle_debt(&pot, &t.bob);
    t.client.finalize(&pot, &t.alice);
    assert_eq!(t.token.balance(&t.bob), 800);
}

#[test]
fn outsiders_and_double_votes_are_refused() {
    let t = setup();
    let pot = open_trip(&t);
    t.client.join(&pot, &t.bob);
    t.client.contribute(&pot, &t.alice, &300);

    assert_eq!(
        t.client.try_contribute(&pot, &t.carol, &100),
        Err(Ok(Error::NotMember))
    );

    let request = t
        .client
        .request_spend(&pot, &t.alice, &t.vendor, &100, &String::from_str(&t.env, "Cafe"));
    assert_eq!(
        t.client.try_approve(&pot, &request, &t.alice),
        Err(Ok(Error::AlreadyApproved))
    );
    assert_eq!(
        t.client.try_join(&pot, &t.bob),
        Err(Ok(Error::AlreadyMember))
    );
}

#[test]
fn the_pot_cannot_overspend() {
    let t = setup();
    let pot = open_trip(&t);
    t.client.contribute(&pot, &t.alice, &100);
    assert_eq!(
        t.client
            .try_request_spend(&pot, &t.alice, &t.vendor, &200, &String::from_str(&t.env, "Qua"))
            ,
        Err(Ok(Error::InsufficientBalance))
    );
}
