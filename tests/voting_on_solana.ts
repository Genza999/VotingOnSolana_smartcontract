import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { expect } from "chai";
import { VotingOnSolana } from "../target/types/voting_on_solana";
const { SystemProgram } = anchor.web3;

describe("voting_on_solana", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.local();
  anchor.setProvider(anchor.AnchorProvider.local());

  const LAMPORTS_PER_SOL = 1000000000;

  const proposer = anchor.web3.Keypair.generate();
  const voter1 = anchor.web3.Keypair.generate();
  const voter2 = anchor.web3.Keypair.generate();
  const voter3 = anchor.web3.Keypair.generate();

  // Global addresses for easy loading to subsequent tests
  let VotersPDA;
  let bump;
  let proposalPDA;

  // Get program IDL
  const program = anchor.workspace.VotingOnSolana as Program<VotingOnSolana>;

  before(async () => {
    // Top up all acounts that will need lamports for account creation
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        proposer.publicKey,
        2 * LAMPORTS_PER_SOL
      )
    );
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        voter1.publicKey,
        2 * LAMPORTS_PER_SOL
      )
    );
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        voter2.publicKey,
        2 * LAMPORTS_PER_SOL
      )
    );
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        voter3.publicKey,
        2 * LAMPORTS_PER_SOL
      )
    );
  });

  it("Table a proposal.", async () => {
    let seedString: string = "thevotingseed";
    let seed: Buffer = Buffer.from(seedString);
    let desc = "We should increase gas fees on Solana";
    let id = 0;

    [proposalPDA, bump] = await anchor.web3.PublicKey.findProgramAddress(
      [seed, proposer.publicKey.toBytes()],
      program.programId
    );

    await program.methods
    .initializeProposal(seedString, desc, id)
    .accounts({
      proposal: proposalPDA,
      proposer: proposer.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .signers([proposer])
    .rpc();

    let proposal = await program.account.proposal.fetch(proposalPDA);

    // Assert proposal id is set to the id 0
    expect(proposal.id).to.equal(id);

    // Assert proposal description is set to the description above
    expect(proposal.desc).to.equal(desc);

    // Assert proposal owner is set to the proposer
    expect(proposal.owner.toString()).to.equal(proposer.publicKey.toString())
    
  });

  it("Submit voters", async () => {
    let proposal_id = 0;
    let voter_addresses = [
      voter1.publicKey,
      voter2.publicKey
    ];

    [VotersPDA, bump] = await anchor.web3.PublicKey.findProgramAddress(
      [proposer.publicKey.toBytes()],
      program.programId
    );

    await program.methods
    .submitVoters(proposal_id, voter_addresses)
    .accounts({
      voters: VotersPDA,
      proposer: proposer.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .signers([proposer])
    .rpc();
    
  })

  it("Voter1 DownVotes proposal",async () => {
    let vote = 0;

    await program.methods
    .vote(vote)
    .accounts({
      voters: VotersPDA,
      proposal: proposalPDA,
      voter: voter1.publicKey
    })
    .signers([voter1])
    .rpc()

    let proposal = await program.account.proposal.fetch(proposalPDA);

    // Assert downvotes are set to 1
    expect(proposal.downVotes.toNumber()).to.equal(1)

    // Assert total votes are now 1
    expect(proposal.totalVotes.toNumber()).to.equal(1)

  })

  it("Unkown user upvoting proposal",async () => {
    let vote = 1;

    await program.methods
    .vote(vote)
    .accounts({
      voters: VotersPDA,
      proposal: proposalPDA,
      voter: voter3.publicKey
    })
    .signers([voter3])
    .rpc()

    let proposal = await program.account.proposal.fetch(proposalPDA);

    // Assert upVotes remain unchanged as user wasnt submitted as voter
    expect(proposal.upVotes.toNumber()).to.equal(0)

    // Assert total votes remain the same as user wasnt submitted as voter
    expect(proposal.totalVotes.toNumber()).to.equal(1)

  })

  it("Voter2 Upvotes proposal",async () => {
    let vote = 1;

    await program.methods
    .vote(vote)
    .accounts({
      voters: VotersPDA,
      proposal: proposalPDA,
      voter: voter2.publicKey
    })
    .signers([voter2])
    .rpc()

    let proposal = await program.account.proposal.fetch(proposalPDA);

    // Assert upvotes are set to 1
    expect(proposal.upVotes.toNumber()).to.equal(1)

    // Assert downvotes remain unchanged
    expect(proposal.downVotes.toNumber()).to.equal(1)

    // Assert total votes equal to both downvotes and upvotes so far
    expect(proposal.totalVotes.toNumber()).to.equal(2)

  })
});
