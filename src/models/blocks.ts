type Block = {
  blockheight: number;
  statehash: string;
  stakingledgerhash: string;
  blockdatetime: number;
  slot: number;
  globalslotsincegenesis: number;
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
  height: number;
};

export type BlockSummary = {
  blockheight: number;
  globalslotsincegenesis: number;
  globalslot: number;
  statehash: string;
  parenthash: string;
  ledgerhash: string;
  datetime: string;
};

