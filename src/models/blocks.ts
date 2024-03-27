export type Block = {
  blockheight: bigint;
  statehash: string;
  stakingledgerhash: string;
  blockdatetime: number;
  slot: bigint;
  globalslotsincegenesis: bigint;
  creatorpublickey: string;
  winnerpublickey: string;
  receiverpublickey: string;
  coinbase: number;
  feetransfertoreceiver: number;
  feetransferfromcoinbase: number;
  usercommandtransactionfees: number;
};

export type Blocks = Array<Block>;

export type Height = {
  height: bigint;
};

export type BlockSummary = {
  blockheight: bigint;
  globalslotsincegenesis: bigint;
  globalslot: bigint;
  statehash: string;
  parenthash: string;
  ledgerhash: string;
  datetime: string;
};

export type EpochBlockRange = {
  epochminblockheight: bigint;
  epochmaxblockheight: bigint;
};

export type EpochSlotRange = {
  epochminslot: bigint;
  epochmaxslot: bigint;
};

