#![no_std]
//! Freelance escrow: a job paid out one milestone at a time.
//!
//! The client locks the whole budget up front, so the worker can see the money
//! exists before starting. Each milestone is released when the client approves
//! it. Two clocks keep both sides honest without anyone holding the money:
//! once work is handed in, silence from the client releases the milestone to
//! the worker; once a deadline passes with nothing handed in, the client takes
//! that milestone back. A named arbiter can only split a disputed milestone
//! between the two of them, never take it.

use soroban_sdk::{
    contract, contracterror, contractevent, contractimpl, contracttype, token, Address, Env,
    String, Vec,
};

const MAX_MILESTONES: u32 = 12;
const BPS: i128 = 10_000;

#[contracttype]
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum JobStatus {
    /// Budget is locked, waiting for a worker to take the job.
    Funded = 0,
    /// A worker took it, milestones are in play.
    Working = 1,
    /// Every milestone reached an end state.
    Done = 2,
    /// Nobody took it and the client pulled the budget back.
    Cancelled = 3,
}

#[contracttype]
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum StepStatus {
    /// Not handed in yet.
    Open = 0,
    /// Handed in, the review clock is running.
    Submitted = 1,
    /// Paid to the worker.
    Released = 2,
    /// Paid back to the client.
    Refunded = 3,
    /// Waiting for the arbiter.
    Disputed = 4,
    /// Split between the two sides by the arbiter.
    Split = 5,
}

#[contracttype]
#[derive(Clone)]
pub struct Step {
    pub idx: u32,
    pub amount: i128,
    /// Hand in before this, or the client may take the money back.
    pub deadline: u64,
    pub status: StepStatus,
    pub submitted_at: u64,
}

#[contracttype]
#[derive(Clone)]
pub struct Job {
    pub id: u32,
    pub title: String,
    pub token: Address,
    pub client: Address,
    pub worker: Option<Address>,
    pub arbiter: Address,
    pub status: JobStatus,
    pub total: i128,
    /// How long the client has to review a handed in milestone.
    pub review_secs: u64,
    pub created_at: u64,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    JobCount,
    Job(u32),
    Steps(u32),
}

#[contracterror]
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
#[repr(u32)]
pub enum Error {
    JobNotFound = 1,
    StepNotFound = 2,
    NotClient = 3,
    NotWorker = 4,
    NotArbiter = 5,
    NotAParty = 6,
    JobNotOpen = 7,
    JobNotWorking = 8,
    AlreadyTaken = 9,
    OwnJob = 10,
    StepNotOpen = 11,
    StepNotSubmitted = 12,
    StepNotDisputed = 13,
    DeadlinePassed = 14,
    DeadlineNotPassed = 15,
    ReviewStillOpen = 16,
    InvalidAmount = 17,
    InvalidSteps = 18,
    InvalidShare = 19,
}

// ---- events ----
// The ledger keeps the whole history of a job, readable in any explorer.

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct JobPosted {
    #[topic]
    pub job: u32,
    pub client: Address,
    pub total: i128,
    pub steps: u32,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct JobAccepted {
    #[topic]
    pub job: u32,
    pub worker: Address,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct JobCancelled {
    #[topic]
    pub job: u32,
    pub refunded: i128,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct StepSubmitted {
    #[topic]
    pub job: u32,
    pub step: u32,
    pub at: u64,
    pub review_until: u64,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct StepReleased {
    #[topic]
    pub job: u32,
    pub step: u32,
    pub amount: i128,
    /// True when the client stayed silent and the clock released it.
    pub by_timeout: bool,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct StepReclaimed {
    #[topic]
    pub job: u32,
    pub step: u32,
    pub amount: i128,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct StepDisputed {
    #[topic]
    pub job: u32,
    pub step: u32,
    pub by: Address,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct StepResolved {
    #[topic]
    pub job: u32,
    pub step: u32,
    pub to_worker: i128,
    pub to_client: i128,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct JobDone {
    #[topic]
    pub job: u32,
    pub total: i128,
}

#[contract]
pub struct Escrow;

#[contractimpl]
impl Escrow {
    /// Posts a job and locks the whole budget in the contract.
    pub fn create_job(
        env: Env,
        client: Address,
        title: String,
        token: Address,
        arbiter: Address,
        review_secs: u64,
        amounts: Vec<i128>,
        deadlines: Vec<u64>,
    ) -> Result<u32, Error> {
        client.require_auth();

        if amounts.len() == 0 || amounts.len() > MAX_MILESTONES || amounts.len() != deadlines.len()
        {
            return Err(Error::InvalidSteps);
        }

        let now = env.ledger().timestamp();
        let mut steps = Vec::new(&env);
        let mut total: i128 = 0;
        for idx in 0..amounts.len() {
            let amount = amounts.get(idx).unwrap();
            let deadline = deadlines.get(idx).unwrap();
            if amount <= 0 {
                return Err(Error::InvalidAmount);
            }
            if deadline <= now {
                return Err(Error::DeadlinePassed);
            }
            total += amount;
            steps.push_back(Step {
                idx,
                amount,
                deadline,
                status: StepStatus::Open,
                submitted_at: 0,
            });
        }

        let id = env
            .storage()
            .instance()
            .get::<_, u32>(&DataKey::JobCount)
            .unwrap_or(0)
            + 1;

        token::Client::new(&env, &token).transfer(
            &client,
            &env.current_contract_address(),
            &total,
        );

        let job = Job {
            id,
            title,
            token,
            client: client.clone(),
            worker: None,
            arbiter,
            status: JobStatus::Funded,
            total,
            review_secs,
            created_at: now,
        };

        env.storage().instance().set(&DataKey::JobCount, &id);
        env.storage().persistent().set(&DataKey::Job(id), &job);
        env.storage().persistent().set(&DataKey::Steps(id), &steps);

        JobPosted {
            job: id,
            client,
            total,
            steps: steps.len(),
        }
        .publish(&env);
        Ok(id)
    }

    /// Takes the job. From here the worker can hand milestones in.
    pub fn accept(env: Env, job_id: u32, worker: Address) -> Result<(), Error> {
        worker.require_auth();

        let mut job = Self::load_job(&env, job_id)?;
        if job.status != JobStatus::Funded {
            return Err(Error::AlreadyTaken);
        }
        if job.client == worker {
            return Err(Error::OwnJob);
        }

        job.worker = Some(worker.clone());
        job.status = JobStatus::Working;
        Self::save_job(&env, &job);

        JobAccepted { job: job_id, worker }.publish(&env);
        Ok(())
    }

    /// Pulls the budget back while nobody has taken the job.
    pub fn cancel_job(env: Env, job_id: u32, caller: Address) -> Result<(), Error> {
        caller.require_auth();

        let mut job = Self::load_job(&env, job_id)?;
        if job.client != caller {
            return Err(Error::NotClient);
        }
        if job.status != JobStatus::Funded {
            return Err(Error::JobNotOpen);
        }

        token::Client::new(&env, &job.token).transfer(
            &env.current_contract_address(),
            &job.client,
            &job.total,
        );

        job.status = JobStatus::Cancelled;
        Self::save_job(&env, &job);

        JobCancelled {
            job: job_id,
            refunded: job.total,
        }
        .publish(&env);
        Ok(())
    }

    /// Hands a milestone in and starts the review clock.
    pub fn submit(env: Env, job_id: u32, idx: u32, worker: Address) -> Result<(), Error> {
        worker.require_auth();

        let job = Self::load_job(&env, job_id)?;
        Self::require_worker(&job, &worker)?;
        if job.status != JobStatus::Working {
            return Err(Error::JobNotWorking);
        }

        let mut steps = Self::load_steps(&env, job_id);
        let mut step = steps.get(idx).ok_or(Error::StepNotFound)?;
        if step.status != StepStatus::Open {
            return Err(Error::StepNotOpen);
        }

        let now = env.ledger().timestamp();
        if now > step.deadline {
            return Err(Error::DeadlinePassed);
        }

        step.status = StepStatus::Submitted;
        step.submitted_at = now;
        steps.set(idx, step);
        env.storage().persistent().set(&DataKey::Steps(job_id), &steps);

        StepSubmitted {
            job: job_id,
            step: idx,
            at: now,
            review_until: now + job.review_secs,
        }
        .publish(&env);
        Ok(())
    }

    /// Client accepts the work and the milestone is paid out.
    pub fn approve(env: Env, job_id: u32, idx: u32, caller: Address) -> Result<(), Error> {
        caller.require_auth();

        let job = Self::load_job(&env, job_id)?;
        if job.client != caller {
            return Err(Error::NotClient);
        }

        let mut steps = Self::load_steps(&env, job_id);
        let step = steps.get(idx).ok_or(Error::StepNotFound)?;
        if step.status != StepStatus::Submitted {
            return Err(Error::StepNotSubmitted);
        }

        Self::pay(&env, &job, step.amount, true);
        Self::close_step(&env, job_id, &mut steps, idx, StepStatus::Released);

        StepReleased {
            job: job_id,
            step: idx,
            amount: step.amount,
            by_timeout: false,
        }
        .publish(&env);
        Ok(())
    }

    /// The client stayed silent past the review window, so the worker takes it.
    pub fn claim(env: Env, job_id: u32, idx: u32, worker: Address) -> Result<(), Error> {
        worker.require_auth();

        let job = Self::load_job(&env, job_id)?;
        Self::require_worker(&job, &worker)?;

        let mut steps = Self::load_steps(&env, job_id);
        let step = steps.get(idx).ok_or(Error::StepNotFound)?;
        if step.status != StepStatus::Submitted {
            return Err(Error::StepNotSubmitted);
        }
        if env.ledger().timestamp() < step.submitted_at + job.review_secs {
            return Err(Error::ReviewStillOpen);
        }

        Self::pay(&env, &job, step.amount, true);
        Self::close_step(&env, job_id, &mut steps, idx, StepStatus::Released);

        StepReleased {
            job: job_id,
            step: idx,
            amount: step.amount,
            by_timeout: true,
        }
        .publish(&env);
        Ok(())
    }

    /// Nothing was handed in before the deadline, so the client takes it back.
    pub fn reclaim(env: Env, job_id: u32, idx: u32, caller: Address) -> Result<(), Error> {
        caller.require_auth();

        let job = Self::load_job(&env, job_id)?;
        if job.client != caller {
            return Err(Error::NotClient);
        }

        let mut steps = Self::load_steps(&env, job_id);
        let step = steps.get(idx).ok_or(Error::StepNotFound)?;
        if step.status != StepStatus::Open {
            return Err(Error::StepNotOpen);
        }
        if env.ledger().timestamp() <= step.deadline {
            return Err(Error::DeadlineNotPassed);
        }

        Self::pay(&env, &job, step.amount, false);
        Self::close_step(&env, job_id, &mut steps, idx, StepStatus::Refunded);

        StepReclaimed {
            job: job_id,
            step: idx,
            amount: step.amount,
        }
        .publish(&env);
        Ok(())
    }

    /// Either side can send a handed in milestone to the arbiter.
    pub fn dispute(env: Env, job_id: u32, idx: u32, caller: Address) -> Result<(), Error> {
        caller.require_auth();

        let job = Self::load_job(&env, job_id)?;
        let is_worker = match &job.worker {
            Some(worker) => *worker == caller,
            None => false,
        };
        if job.client != caller && !is_worker {
            return Err(Error::NotAParty);
        }

        let mut steps = Self::load_steps(&env, job_id);
        let mut step = steps.get(idx).ok_or(Error::StepNotFound)?;
        if step.status != StepStatus::Submitted {
            return Err(Error::StepNotSubmitted);
        }

        step.status = StepStatus::Disputed;
        steps.set(idx, step);
        env.storage().persistent().set(&DataKey::Steps(job_id), &steps);

        StepDisputed {
            job: job_id,
            step: idx,
            by: caller,
        }
        .publish(&env);
        Ok(())
    }

    /// The arbiter splits a disputed milestone. They cannot keep any of it.
    pub fn resolve(
        env: Env,
        job_id: u32,
        idx: u32,
        caller: Address,
        worker_bps: u32,
    ) -> Result<(), Error> {
        caller.require_auth();

        let job = Self::load_job(&env, job_id)?;
        if job.arbiter != caller {
            return Err(Error::NotArbiter);
        }
        if worker_bps as i128 > BPS {
            return Err(Error::InvalidShare);
        }

        let mut steps = Self::load_steps(&env, job_id);
        let step = steps.get(idx).ok_or(Error::StepNotFound)?;
        if step.status != StepStatus::Disputed {
            return Err(Error::StepNotDisputed);
        }

        let to_worker = step.amount * worker_bps as i128 / BPS;
        let to_client = step.amount - to_worker;
        if to_worker > 0 {
            Self::pay(&env, &job, to_worker, true);
        }
        if to_client > 0 {
            Self::pay(&env, &job, to_client, false);
        }
        Self::close_step(&env, job_id, &mut steps, idx, StepStatus::Split);

        StepResolved {
            job: job_id,
            step: idx,
            to_worker,
            to_client,
        }
        .publish(&env);
        Ok(())
    }

    // ---- views ----

    pub fn get_job(env: Env, job_id: u32) -> Result<Job, Error> {
        Self::load_job(&env, job_id)
    }

    pub fn get_steps(env: Env, job_id: u32) -> Vec<Step> {
        Self::load_steps(&env, job_id)
    }

    pub fn job_count(env: Env) -> u32 {
        env.storage()
            .instance()
            .get::<_, u32>(&DataKey::JobCount)
            .unwrap_or(0)
    }

    /// Budget still locked in the contract for this job.
    pub fn locked(env: Env, job_id: u32) -> Result<i128, Error> {
        let steps = Self::load_steps(&env, job_id);
        let mut locked = 0;
        for step in steps.iter() {
            if step.status == StepStatus::Open || step.status == StepStatus::Submitted
                || step.status == StepStatus::Disputed
            {
                locked += step.amount;
            }
        }
        let _ = Self::load_job(&env, job_id)?;
        Ok(locked)
    }

    // ---- internals ----

    fn load_job(env: &Env, job_id: u32) -> Result<Job, Error> {
        env.storage()
            .persistent()
            .get::<_, Job>(&DataKey::Job(job_id))
            .ok_or(Error::JobNotFound)
    }

    fn save_job(env: &Env, job: &Job) {
        env.storage().persistent().set(&DataKey::Job(job.id), job);
    }

    fn load_steps(env: &Env, job_id: u32) -> Vec<Step> {
        env.storage()
            .persistent()
            .get::<_, Vec<Step>>(&DataKey::Steps(job_id))
            .unwrap_or_else(|| Vec::new(env))
    }

    fn require_worker(job: &Job, who: &Address) -> Result<(), Error> {
        match &job.worker {
            Some(worker) if worker == who => Ok(()),
            _ => Err(Error::NotWorker),
        }
    }

    fn pay(env: &Env, job: &Job, amount: i128, to_worker: bool) {
        let to = if to_worker {
            job.worker.clone().unwrap_or(job.client.clone())
        } else {
            job.client.clone()
        };
        token::Client::new(env, &job.token).transfer(
            &env.current_contract_address(),
            &to,
            &amount,
        );
    }

    /// Writes the end state of a milestone and closes the job once every
    /// milestone has one.
    fn close_step(env: &Env, job_id: u32, steps: &mut Vec<Step>, idx: u32, status: StepStatus) {
        let mut step = steps.get(idx).unwrap();
        step.status = status;
        steps.set(idx, step);
        env.storage().persistent().set(&DataKey::Steps(job_id), steps);

        for step in steps.iter() {
            if step.status == StepStatus::Open
                || step.status == StepStatus::Submitted
                || step.status == StepStatus::Disputed
            {
                return;
            }
        }

        if let Ok(mut job) = Self::load_job(env, job_id) {
            job.status = JobStatus::Done;
            Self::save_job(env, &job);
            JobDone {
                job: job_id,
                total: job.total,
            }
            .publish(env);
        }
    }
}

mod test;
