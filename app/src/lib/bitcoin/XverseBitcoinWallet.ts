import {
    Address,
    AddressPurpose,
    BitcoinNetworkType,
    GetAddressResponse,
    getAddress,
    signTransaction
} from "sats-connect";
import { BitcoinWalletBase } from "./BitcoinWalletBase";
import { BitcoinNetwork, CoinselectAddressTypes } from "@atomiqlabs/sdk";
import { BTC_NETWORK, Address as AddressParser } from "@scure/btc-signer";
import { Transaction } from "@scure/btc-signer";

function identifyAddressType(address: string, network: BTC_NETWORK): CoinselectAddressTypes {
    const decoded = AddressParser(network).decode(address);
    switch (decoded.type) {
        case "pkh": return "p2pkh";
        case "wpkh": return "p2wpkh";
        case "tr": return "p2tr";
        case "sh": return "p2sh-p2wpkh";
        default: return "p2wpkh"; // fallback
    }
}

export class XverseBitcoinWallet extends BitcoinWalletBase {
    readonly account: Address;
    readonly addressType: CoinselectAddressTypes;
    readonly bitcoinNetwork: BitcoinNetwork;

    private constructor(
        account: Address,
        bitcoinNetwork: BitcoinNetwork,
        rpcUrl: string
    ) {
        super("Xverse", "/icons/xverse.svg", bitcoinNetwork, rpcUrl);
        this.account = account;
        this.bitcoinNetwork = bitcoinNetwork;
        this.addressType = identifyAddressType(account.address, this.network);
    }

    static async connect(bitcoinNetwork: BitcoinNetwork, rpcUrl: string): Promise<XverseBitcoinWallet> {
        const networkType = bitcoinNetwork === BitcoinNetwork.MAINNET 
            ? BitcoinNetworkType.Mainnet 
            : "Testnet4" as any;

        let result: GetAddressResponse | null = null;
        let cancelled = false;

        await getAddress({
            payload: {
                purposes: [AddressPurpose.Payment],
                message: "Connect your Bitcoin wallet to OneSat",
                network: { type: networkType }
            },
            onFinish: (_result: GetAddressResponse) => {
                result = _result;
            },
            onCancel: () => { cancelled = true; }
        });

        if (cancelled) {
            throw new Error("User cancelled connection request");
        }

        if (!result) {
            throw new Error("Failed to connect to Xverse wallet");
        }

        const paymentAccount = result.addresses.find(a => a.purpose === AddressPurpose.Payment);
        if (!paymentAccount) {
            throw new Error("No payment address found");
        }

        console.log("Xverse wallet connected:", paymentAccount.address);
        return new XverseBitcoinWallet(paymentAccount, bitcoinNetwork, rpcUrl);
    }

    getReceiveAddress(): string {
        return this.account.address;
    }

    getBalance(): Promise<{ confirmedBalance: bigint; unconfirmedBalance: bigint }> {
        return super._getBalance(this.account.address);
    }

    protected toBitcoinWalletAccounts(): {
        pubkey: string;
        address: string;
        addressType: CoinselectAddressTypes;
    }[] {
        return [{
            pubkey: this.account.publicKey,
            address: this.account.address,
            addressType: this.addressType
        }];
    }

    async sendTransaction(address: string, amount: bigint, feeRate?: number): Promise<string> {
        console.log(`XverseBitcoinWallet: Sending ${amount} sats to ${address}`);
        
        const { psbt } = await super._getPsbt(
            this.toBitcoinWalletAccounts(),
            address,
            Number(amount),
            feeRate
        );

        if (!psbt) {
            throw new Error("Not enough balance!");
        }

        const networkType = this.bitcoinNetwork === BitcoinNetwork.MAINNET 
            ? BitcoinNetworkType.Mainnet 
            : "Testnet4" as any;

        let txId: string | null = null;
        let psbtBase64: string | null = null;
        let cancelled = false;

        await signTransaction({
            payload: {
                network: { type: networkType },
                message: "Sign swap transaction",
                psbtBase64: Buffer.from(psbt.toPSBT(0)).toString("base64"),
                broadcast: true,
                inputsToSign: [{
                    address: this.account.address,
                    signingIndexes: Array.from({ length: psbt.inputsLength }, (_, i) => i)
                }]
            },
            onFinish: (resp: { txId?: string; psbtBase64?: string }) => {
                console.log("Xverse transaction signed:", resp);
                txId = resp.txId || null;
                psbtBase64 = resp.psbtBase64 || null;
            },
            onCancel: () => { cancelled = true; }
        });

        if (cancelled) {
            throw new Error("User cancelled transaction");
        }

        if (!txId) {
            if (!psbtBase64) {
                throw new Error("Transaction not properly signed!");
            }
            const signedPsbt = Transaction.fromPSBT(Buffer.from(psbtBase64, "base64"));
            signedPsbt.finalize();
            const txHex = Buffer.from(signedPsbt.extract()).toString("hex");
            txId = await super._sendTransaction(txHex);
        }

        console.log("Transaction sent:", txId);
        return txId;
    }

    async signPsbt(psbt: Transaction, signInputs: number[]): Promise<Transaction> {
        const networkType = this.bitcoinNetwork === BitcoinNetwork.MAINNET 
            ? BitcoinNetworkType.Mainnet 
            : "Testnet4" as any;

        let psbtBase64: string | null = null;
        let cancelled = false;

        await signTransaction({
            payload: {
                network: { type: networkType },
                message: "Sign transaction",
                psbtBase64: Buffer.from(psbt.toPSBT(0)).toString("base64"),
                inputsToSign: [{
                    address: this.account.address,
                    signingIndexes: signInputs
                }]
            },
            onFinish: (resp: { psbtBase64?: string }) => {
                psbtBase64 = resp.psbtBase64 || null;
            },
            onCancel: () => { cancelled = true; }
        });

        if (cancelled) {
            throw new Error("User cancelled signing");
        }

        if (!psbtBase64) {
            throw new Error("PSBT not properly signed!");
        }

        return Transaction.fromPSBT(Buffer.from(psbtBase64, "base64"));
    }
}

