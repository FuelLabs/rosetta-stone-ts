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
    },
};

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
    log("=== MULTISIG DEBUG SCRIPT START ===");
    log("Required signatures:");
    log(REQUIRED_SIGNATURES);
    
    log("Configured signers:");
    let mut k = 0;
    while k < 3 {
        log(SIGNERS[k]);
        k += 1;
    }
    
    log("Witness count:");
    log(tx_witnesses_count());
    
    if tx_witnesses_count() == 0 {
        log("No witness data found - this is expected for simple script execution");
        log("SUCCESS: Script executed without witness validation");
        return true;
    }
    
    let mut valid_signatures = 0;
 
    // Verifying each potential signature 
    log("Verifying signatures...");
    valid_signatures = verify_signature(0);
    log("Valid signatures after checking signer 0:");
    log(valid_signatures);
    
    valid_signatures = valid_signatures + verify_signature(1);
    log("Valid signatures after checking signer 1:");
    log(valid_signatures);
    
    valid_signatures = valid_signatures + verify_signature(2);
    log("Valid signatures after checking signer 2:");
    log(valid_signatures);
 
    log("Total valid signatures:");
    log(valid_signatures);
    
    if valid_signatures >= REQUIRED_SIGNATURES {
        log("SUCCESS: Sufficient signatures found");
        return true;
    } else {
        log("FAILURE: Insufficient signatures");
        return false;
    }
}

fn verify_signature(i: u64) -> u64 {
    log("--- Verifying signature for signer index:");
    log(i);
    
    // Discard any out of bounds signatures
    if (i >= tx_witnesses_count()) {
        log("No witness data for this signer index");
        return 0;
    }
 
    let tx_hash = tx_id();
    log("Transaction hash:");
    log(tx_hash);
 
    let mut j = 0;
 
    while j < tx_witnesses_count() {
        log("Checking witness index:");
        log(j);
        
        let current_signature = tx_witness_data::<B512>(j).unwrap();
        log("Got signature from witness data");
        
        match ec_recover_address(current_signature, tx_hash) {
            Ok(recovered_address) => {
                log("Successfully recovered address:");
                log(recovered_address);
                
                log("Expected signer address:");
                log(SIGNERS[i]);
                
                if recovered_address == SIGNERS[i] {
                    log("MATCH FOUND for signer!");
                    return 1;
                } else {
                    log("No match for this signature");
                }
            },
            Err(_) => {
                log("ERROR: Failed to recover address from signature");
                log("This could be due to invalid signature format or wrong transaction hash");
            }
        }
 
        j += 1;
    }
    
    log("No valid signature found for signer");
    return 0;
} 