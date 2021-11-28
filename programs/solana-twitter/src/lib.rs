use anchor_lang::prelude::*;
use anchor_lang::solana_program::system_program;
declare_id!("BNMV2mLrcwJ46QZ8k7TwEC1qp4NzR1EK77qabYdsjtan");

#[program]
pub mod solana_twitter {
    use super::*;
    pub fn send_tweet(ctx: Context<SendTweet>, topic:String, content:String) -> ProgramResult {
        let tweet:&mut Account<Tweet> = &mut ctx.accounts.tweet;
        let author: &Signer = &ctx.accounts.author;
        let clock: Clock = Clock::get().unwrap();

        if topic.chars().count() > 50 {
            // exceeds validation
            return Err(ErrorCode::TopicTooLong.into()) //.into() converts enum to err
        }

        if content.chars().count() > 280 {
            // exceeds validation
            return Err(ErrorCode::ContentTooLong.into())
        }

        // fill the Tweet Account with all the data
        tweet.author = *author.key;
        tweet.timestamp = clock.unix_timestamp;
        tweet.topic = topic;
        tweet.content = content;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct SendTweet <'info>{
    #[account(init, payer = author, space= Tweet::LEN)] //telling anchor that we want to initialize this account. init is implicit call to create_program on solana system_program. CPI call
    pub tweet:Account<'info,Tweet>, // this is the account that instruction will create. Account<'info,Tweet> wraps AccountInfo parsed data according to Tweet
    #[account(mut)] // because author is the fee payer we will MUT mutate theri funds
    pub author: Signer<'info>,      // signer/owner of the tweet. Same as AccountInfo, but saying that this account should sign the TX
    #[account(address = system_program::ID)] // make sure ut's a official system_program
    pub system_program:AccountInfo<'info>, // solana system program that will be used to create a tweet account. AccountInfo is unparsed array of bytes
}

const DISCRIMINATOR_LENGTH:usize = 8; // 8 bytes for anchro descriminator
const PUBLIC_KEY_LENGTH:usize = 32; // 32 bytes needed
const TIMESTAMP_LENGTH:usize = 8; // timestamp is 64bits or 8 bytes
const MAX_TOPIC_LENGTH:usize = 50 * 4; // 4bytes per char, 50 char max
const MAX_CONTENT_LENGTH: usize = 280 * 4; // 280 chars max
const STRING_LENGTH_PREFIX: usize = 4; // Stores the size of the string.

#[account] // anchor attribute for easier parsing account data
pub struct Tweet {
    pub author: Pubkey,
    pub timestamp: i64,
    pub topic: String,
    pub content: String,
}

impl Tweet {
    const LEN:usize = DISCRIMINATOR_LENGTH
    + PUBLIC_KEY_LENGTH
    + TIMESTAMP_LENGTH
    + STRING_LENGTH_PREFIX + MAX_TOPIC_LENGTH // Topic.
    + STRING_LENGTH_PREFIX + MAX_CONTENT_LENGTH;
}

#[error]
pub enum ErrorCode {
    #[msg("The provided topic should be 50 chars max.")]
    TopicTooLong,
    #[msg("The provided content should be 280 chars max")]
    ContentTooLong,
}
