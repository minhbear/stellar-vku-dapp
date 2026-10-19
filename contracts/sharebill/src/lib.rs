#![no_std]
//! Share Bill Travel: a shared travel pot.
//!
//! Money and rules live here; names, notes and invite links live off chain.
//! Every member funds the pot with whatever amount they can. Spending needs a
//! request plus more than half of the members approving it. When the trip ends
//! the pot splits the spending equally: whoever underpaid tops up, whoever
//! overpaid gets the difference back.

use soroban_sdk::{
    contract, contracterror, contractevent, contractimpl, contracttype, token, Address, Env, Map,
    String, Vec,
};

const MAX_MEMBERS: u32 = 24;

#[contracttype]
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum PotStatus {
    /// Members may join, fund the pot and spend from it.
    Open = 0,
    /// Trip is over, the equal split is fixed, debts are being topped up.
    Settling = 1,
    /// Everyone has been paid out, balance is zero.
    Closed = 2,
}

#[contracttype]
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum RequestStatus {
    Voting = 0,
    Executed = 1,
    Cancelled = 2,
}

#[contracttype]
#[derive(Clone)]
pub struct Pot {
    pub id: u32,
    pub name: String,
    pub token: Address,
    pub creator: Address,
    pub members: Vec<Address>,
    pub status: PotStatus,
    /// Everything ever paid into the pot, including settlement top ups.
    pub total_in: i128,
    /// Everything ever paid out of the pot through an approved request.
    pub total_out: i128,
    /// Equal share of the spending per member, fixed when settling starts.
    pub share: i128,
    /// Remainder of the equal split, carried by the creator.
    pub share_rest: i128,
}

#[contracttype]
#[derive(Clone)]
pub struct SpendRequest {
    pub id: u32,
    pub pot_id: u32,
    pub requester: Address,
    pub to: Address,
    pub amount: i128,
    pub memo: String,
    pub approvals: Vec<Address>,
    pub status: RequestStatus,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    PotCount,
    Pot(u32),
    /// Address -> amount paid in.
    Paid(u32),
    Requests(u32),
}

#[contracterror]
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
#[repr(u32)]
pub enum Error {
    PotNotFound = 1,
    NotMember = 2,
    AlreadyMember = 3,
    NotCreator = 4,
    PotNotOpen = 5,
    PotNotSettling = 6,
    InvalidAmount = 7,
    RequestNotFound = 8,
    RequestClosed = 9,
    AlreadyApproved = 10,
    InsufficientBalance = 11,
    DebtsOutstanding = 12,
    NoDebt = 13,
    PotFull = 14,
    NoMembers = 15,
}

// ---- events ----
// Each of these lands on the ledger, so a student can open the contract in an
// explorer and read the whole story of a trip.

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PotCreated {
    #[topic]
    pub pot: u32,
    pub creator: Address,
    pub name: String,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MemberJoined {
    #[topic]
    pub pot: u32,
    pub member: Address,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Funded {
    #[topic]
    pub pot: u32,
    #[topic]
    pub member: Address,
    pub amount: i128,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SpendRequested {
    #[topic]
    pub pot: u32,
    pub request: u32,
    pub requester: Address,
    pub amount: i128,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Approved {
    #[topic]
    pub pot: u32,
    pub request: u32,
    pub member: Address,
    pub approvals: u32,
    pub members: u32,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RequestCancelled {
    #[topic]
    pub pot: u32,
    pub request: u32,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Spent {
    #[topic]
    pub pot: u32,
    pub request: u32,
    pub to: Address,
    pub amount: i128,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SettleStarted {
    #[topic]
    pub pot: u32,
    pub share: i128,
    pub spent: i128,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct DebtSettled {
    #[topic]
    pub pot: u32,
    #[topic]
    pub member: Address,
    pub amount: i128,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Refunded {
    #[topic]
    pub pot: u32,
    #[topic]
    pub member: Address,
    pub amount: i128,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PotClosed {
    #[topic]
    pub pot: u32,
    pub by: Address,
}

#[contract]
pub struct ShareBill;

#[contractimpl]
impl ShareBill {
    /// Opens a pot. The creator is its first member.
    pub fn create_pot(
        env: Env,
        creator: Address,
        name: String,
        token: Address,
    ) -> Result<u32, Error> {
        creator.require_auth();

        let id = env
            .storage()
            .instance()
            .get::<_, u32>(&DataKey::PotCount)
            .unwrap_or(0)
            + 1;

        let mut members = Vec::new(&env);
        members.push_back(creator.clone());

        let pot = Pot {
            id,
            name,
            token,
            creator: creator.clone(),
            members,
            status: PotStatus::Open,
            total_in: 0,
            total_out: 0,
            share: 0,
            share_rest: 0,
        };

        env.storage().instance().set(&DataKey::PotCount, &id);
        env.storage().persistent().set(&DataKey::Pot(id), &pot);
        env.storage()
            .persistent()
            .set(&DataKey::Paid(id), &Map::<Address, i128>::new(&env));
        env.storage()
            .persistent()
            .set(&DataKey::Requests(id), &Vec::<SpendRequest>::new(&env));

        PotCreated {
            pot: id,
            creator,
            name: pot.name,
        }
        .publish(&env);
        Ok(id)
    }

    /// Joins an open pot. Anyone holding the pot id (the invite link) may join.
    pub fn join(env: Env, pot_id: u32, member: Address) -> Result<(), Error> {
        member.require_auth();

        let mut pot = Self::load_pot(&env, pot_id)?;
        if pot.status != PotStatus::Open {
            return Err(Error::PotNotOpen);
        }
        if pot.members.contains(&member) {
            return Err(Error::AlreadyMember);
        }
        if pot.members.len() >= MAX_MEMBERS {
            return Err(Error::PotFull);
        }

        pot.members.push_back(member.clone());
        Self::save_pot(&env, &pot);

        MemberJoined { pot: pot_id, member }.publish(&env);
        Ok(())
    }

    /// Pays money into the pot. Amounts do not have to be equal.
    pub fn contribute(env: Env, pot_id: u32, from: Address, amount: i128) -> Result<(), Error> {
        from.require_auth();
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        let mut pot = Self::load_pot(&env, pot_id)?;
        if pot.status != PotStatus::Open {
            return Err(Error::PotNotOpen);
        }
        if !pot.members.contains(&from) {
            return Err(Error::NotMember);
        }

        token::Client::new(&env, &pot.token).transfer(
            &from,
            &env.current_contract_address(),
            &amount,
        );

        let mut paid = Self::load_paid(&env, pot_id);
        paid.set(from.clone(), paid.get(from.clone()).unwrap_or(0) + amount);
        env.storage().persistent().set(&DataKey::Paid(pot_id), &paid);

        pot.total_in += amount;
        Self::save_pot(&env, &pot);

        Funded {
            pot: pot_id,
            member: from,
            amount,
        }
        .publish(&env);
        Ok(())
    }

    /// Asks the group to spend from the pot. Only members may ask.
    pub fn request_spend(
        env: Env,
        pot_id: u32,
        requester: Address,
        to: Address,
        amount: i128,
        memo: String,
    ) -> Result<u32, Error> {
        requester.require_auth();
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        let pot = Self::load_pot(&env, pot_id)?;
        if pot.status != PotStatus::Open {
            return Err(Error::PotNotOpen);
        }
        if !pot.members.contains(&requester) {
            return Err(Error::NotMember);
        }
        if amount > pot.total_in - pot.total_out {
            return Err(Error::InsufficientBalance);
        }

        let mut requests = Self::load_requests(&env, pot_id);
        let id = requests.len() + 1;

        let mut approvals = Vec::new(&env);
        approvals.push_back(requester.clone());

        let request = SpendRequest {
            id,
            pot_id,
            requester: requester.clone(),
            to,
            amount,
            memo,
            approvals,
            status: RequestStatus::Voting,
        };
        requests.push_back(request);
        env.storage()
            .persistent()
            .set(&DataKey::Requests(pot_id), &requests);

        SpendRequested {
            pot: pot_id,
            request: id,
            requester,
            amount,
        }
        .publish(&env);

        // A single member pot can spend straight away.
        Self::try_execute(&env, pot_id, id)?;
        Ok(id)
    }

    /// Approves a spend request. Passing half of the members pays it out.
    pub fn approve(env: Env, pot_id: u32, request_id: u32, member: Address) -> Result<(), Error> {
        member.require_auth();

        let pot = Self::load_pot(&env, pot_id)?;
        if pot.status != PotStatus::Open {
            return Err(Error::PotNotOpen);
        }
        if !pot.members.contains(&member) {
            return Err(Error::NotMember);
        }

        let mut requests = Self::load_requests(&env, pot_id);
        let index = Self::request_index(&requests, request_id)?;
        let mut request = requests.get(index).unwrap();
        if request.status != RequestStatus::Voting {
            return Err(Error::RequestClosed);
        }
        if request.approvals.contains(&member) {
            return Err(Error::AlreadyApproved);
        }

        request.approvals.push_back(member.clone());
        let approvals = request.approvals.len();
        requests.set(index, request);
        env.storage()
            .persistent()
            .set(&DataKey::Requests(pot_id), &requests);

        Approved {
            pot: pot_id,
            request: request_id,
            member,
            approvals,
            members: pot.members.len(),
        }
        .publish(&env);

        Self::try_execute(&env, pot_id, request_id)?;
        Ok(())
    }

    /// Withdraws a request. Only whoever opened it may do that.
    pub fn cancel_request(
        env: Env,
        pot_id: u32,
        request_id: u32,
        caller: Address,
    ) -> Result<(), Error> {
        caller.require_auth();

        let mut requests = Self::load_requests(&env, pot_id);
        let index = Self::request_index(&requests, request_id)?;
        let mut request = requests.get(index).unwrap();
        if request.requester != caller {
            return Err(Error::NotMember);
        }
        if request.status != RequestStatus::Voting {
            return Err(Error::RequestClosed);
        }

        request.status = RequestStatus::Cancelled;
        requests.set(index, request);
        env.storage()
            .persistent()
            .set(&DataKey::Requests(pot_id), &requests);

        RequestCancelled {
            pot: pot_id,
            request: request_id,
        }
        .publish(&env);
        Ok(())
    }

    /// Ends the trip and fixes the equal split. Open votes are dropped.
    pub fn start_settle(env: Env, pot_id: u32, caller: Address) -> Result<(), Error> {
        caller.require_auth();

        let mut pot = Self::load_pot(&env, pot_id)?;
        if pot.creator != caller {
            return Err(Error::NotCreator);
        }
        if pot.status != PotStatus::Open {
            return Err(Error::PotNotOpen);
        }
        let count = pot.members.len() as i128;
        if count == 0 {
            return Err(Error::NoMembers);
        }

        let mut requests = Self::load_requests(&env, pot_id);
        for index in 0..requests.len() {
            let mut request = requests.get(index).unwrap();
            if request.status == RequestStatus::Voting {
                request.status = RequestStatus::Cancelled;
                requests.set(index, request);
            }
        }
        env.storage()
            .persistent()
            .set(&DataKey::Requests(pot_id), &requests);

        pot.share = pot.total_out / count;
        pot.share_rest = pot.total_out % count;
        pot.status = PotStatus::Settling;
        Self::save_pot(&env, &pot);

        SettleStarted {
            pot: pot_id,
            share: pot.share,
            spent: pot.total_out,
        }
        .publish(&env);
        Ok(())
    }

    /// Tops up the shortfall of a member who paid in less than their share.
    pub fn settle_debt(env: Env, pot_id: u32, member: Address) -> Result<(), Error> {
        member.require_auth();

        let mut pot = Self::load_pot(&env, pot_id)?;
        if pot.status != PotStatus::Settling {
            return Err(Error::PotNotSettling);
        }
        if !pot.members.contains(&member) {
            return Err(Error::NotMember);
        }

        let mut paid = Self::load_paid(&env, pot_id);
        let debt = Self::debt_of(&pot, &paid, &member);
        if debt <= 0 {
            return Err(Error::NoDebt);
        }

        token::Client::new(&env, &pot.token).transfer(
            &member,
            &env.current_contract_address(),
            &debt,
        );

        paid.set(member.clone(), paid.get(member.clone()).unwrap_or(0) + debt);
        env.storage().persistent().set(&DataKey::Paid(pot_id), &paid);

        pot.total_in += debt;
        Self::save_pot(&env, &pot);

        DebtSettled {
            pot: pot_id,
            member,
            amount: debt,
        }
        .publish(&env);
        Ok(())
    }

    /// Pays everyone who overpaid and closes the pot. Needs every debt settled.
    pub fn finalize(env: Env, pot_id: u32, caller: Address) -> Result<(), Error> {
        caller.require_auth();

        let mut pot = Self::load_pot(&env, pot_id)?;
        if pot.status != PotStatus::Settling {
            return Err(Error::PotNotSettling);
        }

        let paid = Self::load_paid(&env, pot_id);
        for member in pot.members.iter() {
            if Self::debt_of(&pot, &paid, &member) > 0 {
                return Err(Error::DebtsOutstanding);
            }
        }

        let client = token::Client::new(&env, &pot.token);
        let here = env.current_contract_address();
        for member in pot.members.iter() {
            let refund = Self::credit_of(&pot, &paid, &member);
            if refund > 0 {
                client.transfer(&here, &member, &refund);
                Refunded {
                    pot: pot_id,
                    member,
                    amount: refund,
                }
                .publish(&env);
            }
        }

        pot.status = PotStatus::Closed;
        Self::save_pot(&env, &pot);

        PotClosed { pot: pot_id, by: caller }.publish(&env);
        Ok(())
    }

    // ---- views ----

    pub fn get_pot(env: Env, pot_id: u32) -> Result<Pot, Error> {
        Self::load_pot(&env, pot_id)
    }

    pub fn pot_count(env: Env) -> u32 {
        env.storage()
            .instance()
            .get::<_, u32>(&DataKey::PotCount)
            .unwrap_or(0)
    }

    pub fn get_requests(env: Env, pot_id: u32) -> Vec<SpendRequest> {
        Self::load_requests(&env, pot_id)
    }

    /// Money still sitting in the pot.
    pub fn balance(env: Env, pot_id: u32) -> Result<i128, Error> {
        let pot = Self::load_pot(&env, pot_id)?;
        Ok(pot.total_in - pot.total_out)
    }

    /// What one member paid in, owes, and gets back.
    pub fn position(env: Env, pot_id: u32, member: Address) -> Result<(i128, i128, i128), Error> {
        let pot = Self::load_pot(&env, pot_id)?;
        let paid_map = Self::load_paid(&env, pot_id);
        let paid = paid_map.get(member.clone()).unwrap_or(0);
        Ok((
            paid,
            Self::debt_of(&pot, &paid_map, &member),
            Self::credit_of(&pot, &paid_map, &member),
        ))
    }

    pub fn paid_by(env: Env, pot_id: u32, member: Address) -> i128 {
        Self::load_paid(&env, pot_id).get(member).unwrap_or(0)
    }

    // ---- internals ----

    fn load_pot(env: &Env, pot_id: u32) -> Result<Pot, Error> {
        env.storage()
            .persistent()
            .get::<_, Pot>(&DataKey::Pot(pot_id))
            .ok_or(Error::PotNotFound)
    }

    fn save_pot(env: &Env, pot: &Pot) {
        env.storage().persistent().set(&DataKey::Pot(pot.id), pot);
    }

    fn load_paid(env: &Env, pot_id: u32) -> Map<Address, i128> {
        env.storage()
            .persistent()
            .get::<_, Map<Address, i128>>(&DataKey::Paid(pot_id))
            .unwrap_or_else(|| Map::new(env))
    }

    fn load_requests(env: &Env, pot_id: u32) -> Vec<SpendRequest> {
        env.storage()
            .persistent()
            .get::<_, Vec<SpendRequest>>(&DataKey::Requests(pot_id))
            .unwrap_or_else(|| Vec::new(env))
    }

    fn request_index(requests: &Vec<SpendRequest>, request_id: u32) -> Result<u32, Error> {
        for index in 0..requests.len() {
            if requests.get(index).unwrap().id == request_id {
                return Ok(index);
            }
        }
        Err(Error::RequestNotFound)
    }

    /// The share this member should carry. The creator carries the remainder so
    /// the shares always add up to what the group spent.
    fn share_of(pot: &Pot, member: &Address) -> i128 {
        if *member == pot.creator {
            pot.share + pot.share_rest
        } else {
            pot.share
        }
    }

    fn debt_of(pot: &Pot, paid: &Map<Address, i128>, member: &Address) -> i128 {
        let owed = Self::share_of(pot, member) - paid.get(member.clone()).unwrap_or(0);
        if owed > 0 {
            owed
        } else {
            0
        }
    }

    fn credit_of(pot: &Pot, paid: &Map<Address, i128>, member: &Address) -> i128 {
        let over = paid.get(member.clone()).unwrap_or(0) - Self::share_of(pot, member);
        if over > 0 {
            over
        } else {
            0
        }
    }

    /// Pays a request out once more than half of the members have approved.
    fn try_execute(env: &Env, pot_id: u32, request_id: u32) -> Result<(), Error> {
        let mut pot = Self::load_pot(env, pot_id)?;
        let mut requests = Self::load_requests(env, pot_id);
        let index = Self::request_index(&requests, request_id)?;
        let mut request = requests.get(index).unwrap();

        if request.status != RequestStatus::Voting {
            return Ok(());
        }
        if request.approvals.len() * 2 <= pot.members.len() {
            return Ok(());
        }
        if request.amount > pot.total_in - pot.total_out {
            return Err(Error::InsufficientBalance);
        }

        token::Client::new(env, &pot.token).transfer(
            &env.current_contract_address(),
            &request.to,
            &request.amount,
        );

        pot.total_out += request.amount;
        Self::save_pot(env, &pot);

        let paid_to = request.to.clone();
        let amount = request.amount;
        request.status = RequestStatus::Executed;
        requests.set(index, request);
        env.storage()
            .persistent()
            .set(&DataKey::Requests(pot_id), &requests);

        Spent {
            pot: pot_id,
            request: request_id,
            to: paid_to,
            amount,
        }
        .publish(&env);
        Ok(())
    }
}

mod test;
