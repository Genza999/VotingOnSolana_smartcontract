use anchor_lang::prelude::*;

declare_id!("BWRJc9qJtZPFotMtVVvejQMyp7PNK9cYKwbJerFFiNUt");

#[program]
pub mod voting_on_solana {

    use super::*;

    pub fn initialize_proposal(ctx: Context<Initialize>, _seed: String, desc: String, id: u8) -> Result<()> {
        // Initialize Proposal
        let proposal = &mut ctx.accounts.proposal;
        proposal.id = id;
        proposal.desc = desc;
        proposal.owner = ctx.accounts.proposer.key();
        Ok(())
    }

    pub fn submit_voters(ctx: Context<AddVoters>, proposal_id: u8, voter_addresses:Vec<Pubkey>) -> Result<()> {
        // Submit voters to participate in voting
        let mut already_exists = false;
        let voters = &mut ctx.accounts.voters;

        for (index, voter_address) in voter_addresses.iter().enumerate() {
            for voter in voters.voters.iter() {
                if *voter_address == voter.pubkey && voter.proposal_id == proposal_id {
                    msg!("Voter: {:?} for proposal: {:?} already exists!", voter_address, proposal_id);
                    already_exists = true;
                }
            }
            
            // if user hasnt already been added as a voter
            if !already_exists {
                voters.voters.push(Voter{
                    id: index as u8,
                    proposal_id: proposal_id,
                    pubkey: *voter_address,
                    voted: false
                })
            }
        }
        Ok(())
    }

    pub fn vote(ctx: Context<AddVote>, vote: u8) -> Result<()>{
        // Voter submits votes for the proposal
        let voters = &mut ctx.accounts.voters;
        let current_voter = ctx.accounts.voter.key();
        let proposal = &mut ctx.accounts.proposal;

        for voter in voters.voters.iter() {
            if voter.pubkey.to_string() == current_voter.to_string() {
                if !voter.voted {
                    if vote == 1 {
                        proposal.up_votes += 1;
                    } else {
                        proposal.down_votes += 1;
                    }
                    proposal.total_votes += 1;
                }  
            }
        }

        Ok(())
    }
}


// =======Context=======

#[derive(Accounts)]
#[instruction(seed: String)]
pub struct Initialize<'info> {
    #[account(
        init,
        seeds = [
            seed.as_bytes(),
            proposer.key().as_ref()
        ],
        bump,
        payer=proposer,
        space=180
    )]
    pub proposal: Account<'info, Proposal>,
    #[account(mut)]
    pub proposer: Signer<'info>,
    pub system_program: Program<'info, System>
}

#[derive(Accounts)]
pub struct AddVoters<'info> {
    #[account(
        init,
        seeds = [
            proposer.key().as_ref()
        ],
        bump,
        payer=proposer,
        space=180
    )]
    pub voters: Account<'info, Voters>,
    #[account(mut)]
    pub proposer: Signer<'info>,
    pub system_program: Program<'info, System>
}


#[derive(Accounts)]
pub struct AddVote<'info> {
    voters: Account<'info, Voters>,
    #[account(mut)]
    proposal: Account<'info, Proposal>,
    #[account(mut)]
    voter: Signer<'info>
}


// =======Accounts=======

#[account]
pub struct Proposal {
    pub id: u8,
    pub desc: String,
    pub up_votes: u128,
    pub down_votes: u128,
    pub total_votes: u128,
    pub owner: Pubkey
}


#[derive(Debug, Clone, AnchorSerialize, AnchorDeserialize)]
pub struct Voter {
    pub id: u8,
    pub pubkey: Pubkey,
    pub proposal_id: u8,
    pub voted: bool
}

#[account]
pub struct Voters {
   pub voters: Vec<Voter>
}
