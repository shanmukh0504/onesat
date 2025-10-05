use starknet::ContractAddress;
use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess};

#[starknet::contract]
mod uda {
    use openzeppelin::token::erc20::interface::{IERC20Dispatcher, IERC20DispatcherTrait};
    use starknet::event::EventEmitter;
    use starknet::get_contract_address;
    use crate::interfaces::{
        Amount, AmountDenomination, IVesuDispatcher, IVesuDispatcherTrait, ModifyPositionParams,
    };
    use super::{ContractAddress, StoragePointerReadAccess, StoragePointerWriteAccess};

    #[storage]
    struct Storage {
        is_initialized: bool,
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
        FundsRecovered: FundsRecovered,
    }

    #[derive(Drop, starknet::Event)]
    struct Initialized {
        #[key]
        user: ContractAddress,
        #[key]
        token: ContractAddress,
        amount: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct FundsRecovered {
        #[key]
        token: ContractAddress,
        amount: u256,
        #[key]
        recipient: ContractAddress,
    }

    pub mod Error {
        pub const ALREADY_INITIALIZED: felt252 = 'Already initialized';
        pub const NOT_INITIALIZED: felt252 = 'Not initialized';
    }

    // Empty constructor
    #[constructor]
    fn constructor(ref self: ContractState) {}

    #[abi(embed_v0)]
    impl VaultImpl of crate::interfaces::IVault<ContractState> {
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

        fn initializer(
            ref self: ContractState,
            user: ContractAddress,
            action: u128,
            amount: u256,
            token: ContractAddress,
            target: ContractAddress,
        ) {
            assert(!self.is_initialized.read(), Error::ALREADY_INITIALIZED);

            self.user.write(user);
            self.action.write(action);
            self.amount.write(amount);
            self.token.write(token);
            self.target.write(target);
            self.is_initialized.write(true);

            if action == 1 {
                InternalImpl::deposit_vesu(@self, target, amount, token, user);
            }

            self
                .emit(
                    Initialized { user, token, amount },
                );
        }

        fn recover(ref self: ContractState) {
            assert(self.is_initialized.read(), Error::NOT_INITIALIZED);

            let token = self.token.read();
            let erc20 = IERC20Dispatcher { contract_address: token };
            let balance = erc20.balance_of(get_contract_address());

            let user = self.user.read();

            if balance > 0 {
                erc20.transfer(user, balance);
                self
                    .emit(
                        FundsRecovered {
                            token,
                            amount: balance,
                            recipient: user,
                        },
                    );
            }
        }

        fn deposit_vesu(
            self: @ContractState,
            target_address: ContractAddress,
            amount: u256,
            token: ContractAddress,
        ) {
            InternalImpl::deposit_vesu(self, target_address, amount, token, self.user.read());
        }
    }

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn deposit_vesu(
            self: @ContractState,
            target_address: ContractAddress,
            amount: u256,
            token: ContractAddress,
            user: ContractAddress,
        ) {
            let vesu = IVesuDispatcher { contract_address: target_address };
            let erc20 = IERC20Dispatcher { contract_address: token };
            erc20.approve(target_address, erc20.balance_of(get_contract_address()));

            vesu
                .modify_position(
                    ModifyPositionParams {
                        collateral_asset: token,
                        debt_asset: token,
                        user: user,
                        collateral: Amount {
                            denomination: AmountDenomination::Assets, value: amount.into(),
                        },
                        debt: Amount { denomination: AmountDenomination::Assets, value: 0.into() },
                    },
                );
        }
    }
}
