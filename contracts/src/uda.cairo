use starknet::ContractAddress;
use starknet::event::EventEmitter;
use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess};

#[starknet::contract]
mod uda {
    use crate::interfaces::IVault;
    use super::{ContractAddress, EventEmitter, StoragePointerReadAccess, StoragePointerWriteAccess};

    #[storage]
    struct Storage {
        user: ContractAddress,
        nonce: u128,
        amount: u256,
        token: ContractAddress,
        target: ContractAddress,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        Initialized: Initialized,
    }

    #[derive(Drop, starknet::Event)]
    struct Initialized {
        #[key]
        user: ContractAddress,
        #[key]
        token: ContractAddress,
        amount_low: u128,
        amount_high: u128,
    }

    #[constructor]
    fn constructor(
        ref self: ContractState,
        user: ContractAddress,
        nonce: u128,
        amount: u256,
        token: ContractAddress,
        target: ContractAddress,
    ) {
        self.user.write(user);
        self.nonce.write(nonce);
        self.amount.write(amount);
        self.token.write(token);
        self.target.write(target);

        self.emit(Initialized { user, token, amount_low: amount.low, amount_high: amount.high });
    }

    #[abi(embed_v0)]
    impl VaultRead of crate::interfaces::IVault<ContractState> {
        fn get_user(self: @ContractState) -> ContractAddress {
            self.user.read()
        }
        fn get_nonce(self: @ContractState) -> u128 {
            self.nonce.read()
        }
        fn get_amount(self: @ContractState) -> u256 {
            self.amount.read()
        }
        fn get_token(self: @ContractState) -> ContractAddress {
            self.token.read()
        }
        fn get_target_address(self: @ContractState) -> ContractAddress {
            self.target.read()
        }
    }
}

