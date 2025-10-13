import { BitcoinWallet, BitcoinNetwork, CoinselectAddressTypes,MempoolBitcoinRpc } from "@atomiqlabs/sdk";
import { NETWORK, TEST_NETWORK, Transaction } from "@scure/btc-signer";

const FEE_MULTIPLIER = 1.25;

export abstract class BitcoinWalletBase extends BitcoinWallet {
    readonly walletName: string;
    readonly walletIcon: string;

    constructor(
        walletName: string,
        walletIcon: string,
        bitcoinNetwork: BitcoinNetwork,
        rpcUrl: string
    ) {
        const network = bitcoinNetwork === BitcoinNetwork.MAINNET ? NETWORK : TEST_NETWORK;
        const rpc = new MempoolBitcoinRpc(rpcUrl);
        super(
            rpc,
            network,
            FEE_MULTIPLIER
        );
        this.walletName = walletName;
        this.walletIcon = walletIcon;
    }

    getName(): string {
        return this.walletName;
    }

    getIcon(): string {
        return this.walletIcon;
    }

    protected abstract toBitcoinWalletAccounts(): {
        pubkey: string,
        address: string,
        addressType: CoinselectAddressTypes
    }[];

    abstract sendTransaction(address: string, amount: bigint, feeRate?: number): Promise<string>;
    abstract getReceiveAddress(): string;
    abstract getBalance(): Promise<{ confirmedBalance: bigint; unconfirmedBalance: bigint }>;

    async getTransactionFee(address: string, amount: bigint, feeRate?: number): Promise<number | null> {
        const { psbt, fee } = await super._getPsbt(this.toBitcoinWalletAccounts(), address, Number(amount), feeRate);
        if (psbt == null) return null;
        return fee;
    }

    async fundPsbt(inputPsbt: Transaction, feeRate?: number): Promise<Transaction> {
        const { psbt } = await super._fundPsbt(this.toBitcoinWalletAccounts(), inputPsbt, feeRate);
        if (psbt == null) {
            throw new Error("Not enough balance!");
        }
        return psbt;
    }

    async signPsbt(psbt: Transaction, signInputs: number[]): Promise<Transaction> {
        throw new Error("signPsbt not implemented for this wallet");
    }
}

