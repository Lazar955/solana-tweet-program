import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { SolanaTwitter } from "../target/types/solana_twitter";
import * as assert from "assert";
import * as bs58 from "bs58";
describe("solana-twitter", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.Provider.env());

  const program = anchor.workspace.SolanaTwitter as Program<SolanaTwitter>;

  it("can send a tweer", async () => {
    const tweetAccount = anchor.web3.Keypair.generate();
    const topic = "topic here";
    const content = "Some cool tweet here!";

    // send the rpc
    await program.rpc.sendTweet(topic, content, {
      accounts: {
        // is the context we want to initialize
        tweet: tweetAccount.publicKey, // new generated accounts public key
        author: program.provider.wallet.publicKey, // access our wallet public key
        systemProgram: anchor.web3.SystemProgram.programId,
      },
      signers: [tweetAccount],
    });

    // get the newly crated tweet accounts
    const tweetAccountData = await program.account.tweet.fetch(
      tweetAccount.publicKey
    );

    // ensure that public key of the created tweet account is the same as pub key of the author
    assert.equal(
      tweetAccountData.author.toBase58(),
      program.provider.wallet.publicKey.toBase58()
    );
    // ensure that tweet account stored data is valid
    assert.equal(tweetAccountData.topic, topic);
    assert.equal(tweetAccountData.content, content);
    // ensure that we have timestamp set on our tweet account
    assert.ok(tweetAccountData.timestamp);
  });

  it("can send a tweet without a topic", async () => {
    const tweetAccount = anchor.web3.Keypair.generate();
    const topic = "";
    const content = "Another tweet!";

    // send the rpc
    await program.rpc.sendTweet(topic, content, {
      accounts: {
        // is the context we want to initialize
        tweet: tweetAccount.publicKey, // new generated accounts public key
        author: program.provider.wallet.publicKey, // access our wallet public key
        systemProgram: anchor.web3.SystemProgram.programId,
      },
      signers: [tweetAccount],
    });

    // get the newly crated tweet accounts
    const tweetAccountData = await program.account.tweet.fetch(
      tweetAccount.publicKey
    );

    // ensure that public key of the created tweet account is the same as pub key of the author
    assert.equal(
      tweetAccountData.author.toBase58(),
      program.provider.wallet.publicKey.toBase58()
    );
    // ensure that tweet account stored data is valid
    assert.equal(tweetAccountData.topic, topic);
    assert.equal(tweetAccountData.content, content);
    // ensure that we have timestamp set on our tweet account
    assert.ok(tweetAccountData.timestamp);
  });

  it("can send a tweet from a different author", async () => {
    const otherUser = anchor.web3.Keypair.generate();
    // ensure that we have enoguh funds for fees
    const txSig = await program.provider.connection.requestAirdrop(
      otherUser.publicKey,
      1000000000
    );
    // wait for the tx to be confirmed
    await program.provider.connection.confirmTransaction(txSig);

    const tweetAccount = anchor.web3.Keypair.generate();
    const topic = "topic here";
    const content = "Another tweet!";

    // send the rpc
    await program.rpc.sendTweet(topic, content, {
      accounts: {
        // is the context we want to initialize
        tweet: tweetAccount.publicKey, // new generated accounts public key
        author: otherUser.publicKey, // access our wallet public key
        systemProgram: anchor.web3.SystemProgram.programId,
      },
      signers: [otherUser, tweetAccount],
    });

    // get the newly crated tweet accounts
    const tweetAccountData = await program.account.tweet.fetch(
      tweetAccount.publicKey
    );

    // ensure that public key of the created tweet account is the same as pub key of the author
    assert.equal(
      tweetAccountData.author.toBase58(),
      otherUser.publicKey.toBase58()
    );
    // ensure that tweet account stored data is valid
    assert.equal(tweetAccountData.topic, topic);
    assert.equal(tweetAccountData.content, content);
    // ensure that we have timestamp set on our tweet account
    assert.ok(tweetAccountData.timestamp);
  });

  it("cannot provide a topic with more than 50 chars", async () => {
    const tweet = anchor.web3.Keypair.generate();
    const topicWith51Chars = "x".repeat(51);
    const content = "Another tweet!";
    const expectedError = "The provided topic should be 50 chars max.";

    try {
      await program.rpc.sendTweet(topicWith51Chars, content, {
        accounts: {
          tweet: tweet.publicKey,
          author: program.provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        },
        signers: [tweet],
      });
    } catch (error) {
      assert.equal(error.msg, expectedError);
      return;
    }

    assert.fail("the instruction should have failed for a 51 char topic");
  });

  it("cannot provide a topic with more than 50 chars", async () => {
    const tweet = anchor.web3.Keypair.generate();
    const topic = "some topic";
    const contentWith281Chars = "x".repeat(281);
    const expectedError = "The provided content should be 280 chars max";

    try {
      await program.rpc.sendTweet(topic, contentWith281Chars, {
        accounts: {
          tweet: tweet.publicKey,
          author: program.provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        },
        signers: [tweet],
      });
    } catch (error) {
      assert.equal(error.msg, expectedError);
      return;
    }

    assert.fail("the instruction should have failed for a 281 char content");
  });

  it("can fetch all tweets", async () => {
    const tweetAccounts = await program.account.tweet.all();
    assert.equal(tweetAccounts.length, 3);
  });

  it("can filter tweets by author", async () => {
    const authorPubKey = program.provider.wallet.publicKey;
    const tweetAccounts = await program.account.tweet.all([
      {
        memcmp: {
          offset: 8, //descriminator offset,
          bytes: authorPubKey.toBase58(),
        },
      },
    ]);
    assert.equal(tweetAccounts.length, 2);
    assert.ok(
      tweetAccounts.every((ta) => {
        return ta.account.author.toBase58() == authorPubKey.toBase58();
      })
    );
  });

  it("can filter tweets by topic", async () => {
    const authorPubKey = program.provider.wallet.publicKey;
    const topic = "topic here";

    const tweetAccounts = await program.account.tweet.all([
      {
        memcmp: {
          offset:
            8 + // Discriminator.
            32 + // Author public key.
            8 + // Timestamp.
            4, // Topic string prefix.
          bytes: bs58.encode(Buffer.from(topic)),
        },
      },
    ]);
    assert.equal(tweetAccounts.length, 2);
    assert.ok(
      tweetAccounts.every((ta) => {
        return ta.account.topic == topic;
      })
    );
  });
});
