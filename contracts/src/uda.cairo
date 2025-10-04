use starknet::ContractAddress;
use starknet::event::EventEmitter;
use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess};

#[starknet::contract]
mod uda {
    use starknet::get_contract_address;
    use alexandria_math::i257::i257;
    use core::num::traits::Zero;
    use crate::interfaces::IVault;
    use crate::interfaces::{IVesuDispatcherTrait, IVesuDispatcher, ModifyPositionParams, Amount, AmountDenomination};
    use openzeppelin::token::erc20::interface::{IERC20Dispatcher, IERC20DispatcherTrait};
    use super::{ContractAddress, EventEmitter, StoragePointerReadAccess, StoragePointerWriteAccess};

    #[storage]
    struct Storage {
        user: ContractAddress,
        action: u128,
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
        action: u128,
        amount: u256,
        token: ContractAddress,
        target: ContractAddress,
    ) {
        self.user.write(user);
        self.action.write(action);
        self.amount.write(amount);
        self.token.write(token);
        self.target.write(target);

        if action == 1 {
            self.deposit_vesu(target, amount, token, user);
        }

        self.emit(Initialized { user, token, amount_low: amount.low, amount_high: amount.high });
    }

    #[abi(embed_v0)]
    impl VaultRead of crate::interfaces::IVault<ContractState> {
        fn get_user(self: @ContractState) -> ContractAddress {
            self.user.read()
        }
        fn get_action(self: @ContractState) -> u128 {
            self.action.read()
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

        fn deposit_vesu(self: @ContractState, target_address: ContractAddress, amount: u256, token: ContractAddress, user: ContractAddress) {
            let vesu = IVesuDispatcher { contract_address: target_address };

            let erc20 = IERC20Dispatcher { contract_address: token };
            erc20.approve(target_address, erc20.balance_of(get_contract_address()));


            vesu.modify_position(ModifyPositionParams {
                collateral_asset: token,
                debt_asset: token,
                user: user,
                collateral: Amount { denomination: AmountDenomination::Assets, value: amount.into() },
                debt: Amount { denomination: AmountDenomination::Assets, value: 0.into() },
            });
        }
    }
}

