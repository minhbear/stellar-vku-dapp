#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    token::{StellarAssetClient, TokenClient},
    vec, Env, String,
};

const DAY: u64 = 86_400;
const REVIEW: u64 = 7 * DAY;

struct Deal<'a> {
    env: Env,
    escrow: EscrowClient<'a>,
    token: TokenClient<'a>,
    token_address: Address,
    client: Address,
    worker: Address,
    arbiter: Address,
}

fn setup() -> Deal<'static> {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().with_mut(|ledger| ledger.timestamp = 1_000_000);

    let issuer = Address::generate(&env);
    let asset = env.register_stellar_asset_contract_v2(issuer);
    let token_address = asset.address();

    let client = Address::generate(&env);
    let worker = Address::generate(&env);
    let arbiter = Address::generate(&env);

    StellarAssetClient::new(&env, &token_address).mint(&client, &1_000);

    let contract_id = env.register(Escrow, ());
    Deal {
        escrow: EscrowClient::new(&env, &contract_id),
        token: TokenClient::new(&env, &token_address),
        token_address,
        client,
        worker,
        arbiter,
        env,
    }
}

/// Three milestones of 100, 200 and 300, due in 10, 20 and 30 days.
fn post_job(d: &Deal) -> u32 {
    let now = d.env.ledger().timestamp();
    d.escrow.create_job(
        &d.client,
        &String::from_str(&d.env, "Landing page cho shop"),
        &d.token_address,
        &d.arbiter,
        &REVIEW,
        &vec![&d.env, 100i128, 200i128, 300i128],
        &vec![&d.env, now + 10 * DAY, now + 20 * DAY, now + 30 * DAY],
    )
}

fn warp(d: &Deal, seconds: u64) {
    let now = d.env.ledger().timestamp();
    d.env.ledger().with_mut(|ledger| ledger.timestamp = now + seconds);
}

#[test]
fn the_budget_is_locked_the_moment_the_job_is_posted() {
    let d = setup();
    let job = post_job(&d);

    assert_eq!(d.token.balance(&d.client), 400);
    assert_eq!(d.token.balance(&d.escrow.address), 600);
    assert_eq!(d.escrow.locked(&job), 600);
    assert_eq!(d.escrow.get_job(&job).status, JobStatus::Funded);
}

#[test]
fn every_approved_milestone_pays_the_worker() {
    let d = setup();
    let job = post_job(&d);
    d.escrow.accept(&job, &d.worker);

    for idx in 0..3u32 {
        d.escrow.submit(&job, &idx, &d.worker);
        d.escrow.approve(&job, &idx, &d.client);
    }

    assert_eq!(d.token.balance(&d.worker), 600);
    assert_eq!(d.token.balance(&d.escrow.address), 0);
    assert_eq!(d.escrow.get_job(&job).status, JobStatus::Done);
}

#[test]
fn silence_from_the_client_releases_the_milestone() {
    let d = setup();
    let job = post_job(&d);
    d.escrow.accept(&job, &d.worker);
    d.escrow.submit(&job, &0, &d.worker);

    assert_eq!(
        d.escrow.try_claim(&job, &0, &d.worker),
        Err(Ok(Error::ReviewStillOpen))
    );

    warp(&d, REVIEW + 1);
    d.escrow.claim(&job, &0, &d.worker);

    assert_eq!(d.token.balance(&d.worker), 100);
    assert_eq!(d.escrow.get_steps(&job).get(0).unwrap().status, StepStatus::Released);
}

#[test]
fn a_missed_deadline_goes_back_to_the_client() {
    let d = setup();
    let job = post_job(&d);
    d.escrow.accept(&job, &d.worker);

    assert_eq!(
        d.escrow.try_reclaim(&job, &0, &d.client),
        Err(Ok(Error::DeadlineNotPassed))
    );

    warp(&d, 11 * DAY);
    d.escrow.reclaim(&job, &0, &d.client);

    assert_eq!(d.token.balance(&d.client), 500);
    assert_eq!(
        d.escrow.try_submit(&job, &0, &d.worker),
        Err(Ok(Error::StepNotOpen))
    );
}

#[test]
fn the_arbiter_can_only_split_between_the_two_sides() {
    let d = setup();
    let job = post_job(&d);
    d.escrow.accept(&job, &d.worker);
    d.escrow.submit(&job, &1, &d.worker);
    d.escrow.dispute(&job, &1, &d.client);

    assert_eq!(
        d.escrow.try_resolve(&job, &1, &d.worker, &10_000),
        Err(Ok(Error::NotArbiter))
    );

    // 60% of 200 to the worker, the rest back to the client.
    d.escrow.resolve(&job, &1, &d.arbiter, &6_000);

    assert_eq!(d.token.balance(&d.worker), 120);
    assert_eq!(d.token.balance(&d.client), 400 + 80);
    assert_eq!(d.token.balance(&d.arbiter), 0);
    assert_eq!(d.escrow.locked(&job), 400);
}

#[test]
fn an_untaken_job_can_be_pulled_back() {
    let d = setup();
    let job = post_job(&d);
    d.escrow.cancel_job(&job, &d.client);

    assert_eq!(d.token.balance(&d.client), 1_000);
    assert_eq!(d.escrow.get_job(&job).status, JobStatus::Cancelled);
    assert_eq!(
        d.escrow.try_accept(&job, &d.worker),
        Err(Ok(Error::AlreadyTaken))
    );
}

#[test]
fn only_the_worker_hands_work_in() {
    let d = setup();
    let job = post_job(&d);
    let stranger = Address::generate(&d.env);

    assert_eq!(
        d.escrow.try_accept(&job, &d.client),
        Err(Ok(Error::OwnJob))
    );
    d.escrow.accept(&job, &d.worker);
    assert_eq!(
        d.escrow.try_submit(&job, &0, &stranger),
        Err(Ok(Error::NotWorker))
    );
    assert_eq!(
        d.escrow.try_cancel_job(&job, &d.client),
        Err(Ok(Error::JobNotOpen))
    );
}

#[test]
fn a_deadline_in_the_past_is_refused() {
    let d = setup();
    let now = d.env.ledger().timestamp();
    assert_eq!(
        d.escrow.try_create_job(
            &d.client,
            &String::from_str(&d.env, "Job cu"),
            &d.token_address,
            &d.arbiter,
            &REVIEW,
            &vec![&d.env, 100i128],
            &vec![&d.env, now - 1],
        ),
        Err(Ok(Error::DeadlinePassed))
    );
}
