script;

use std::{
    ecr::ec_recover_address,
    b512::B512,
    logging::log,
    hash::{Hash, keccak256},
    tx::{
    tx_witness_data,
    tx_witnesses_count,
    tx_id
},};

configurable {
    /// Required signers for the multi-sig.
    SIGNERS: [Address; 3] = [
        Address::zero(),
        Address::zero(), 
        Address::zero(),
    ],
    /// Number of signatures required.
    REQUIRED_SIGNATURES: u64 = 2,
}

fn main() -> bool {
    log(REQUIRED_SIGNATURES);
    if REQUIRED_SIGNATURES > 0 {
        return true;
    }
    return false;
}
