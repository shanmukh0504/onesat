use core::array::ArrayTrait;
use core::hash::HashStateTrait;
use core::pedersen::PedersenTrait;
use core::traits::Into;
use starknet::{ClassHash, ContractAddress};

#[starknet::contract]
mod registryContract {
    use core::hash::HashStateTrait;
    use core::num::traits::Zero;
    use openzeppelin::token::erc20::interface::{IERC20Dispatcher, IERC20DispatcherTrait};
    use starknet::event::EventEmitter;
    use starknet::get_contract_address;
    use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess};
    use starknet::syscalls::deploy_syscall;
    use crate::interfaces::IRegistry;
    use super::{ArrayTrait, ClassHash, ContractAddress, Into, PedersenTrait};

    const CONTRACT_ADDRESS_PREFIX: felt252 = 'STARKNET_CONTRACT_ADDRESS';

    #[storage]
    struct Storage {
        uda_class_hash: ClassHash,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        VaultDeployed: VaultDeployed,
    }

    #[derive(Drop, starknet::Event)]
    struct VaultDeployed {
        #[key]
        vault: ContractAddress,
        #[key]
        user: ContractAddress,
        #[key]
        token: ContractAddress,
    }

    pub mod Error {
        pub const INVALID_ADDRESS: felt252 = 'Invalid address';
        pub const ZERO_AMOUNT: felt252 = 'Zero amount';
        pub const INSUFFICIENT_FUNDS: felt252 = 'Insufficient funds deposited';
    }

    #[constructor]
    fn constructor(ref self: ContractState, class_hash: ClassHash) {
        assert(!class_hash.is_zero(), Error::INVALID_ADDRESS);
        self.uda_class_hash.write(class_hash);
    }

    #[abi(embed_v0)]
    impl RegistryImpl of crate::interfaces::IRegistry<ContractState> {
        fn predict_address(
            self: @ContractState,
            user: ContractAddress,
            nonce: u128,
            amount: u256,
            token: ContractAddress,
            target: ContractAddress,
        ) -> ContractAddress {
            InternalImpl::_validate(user, amount, token, target);
            let salt = InternalImpl::_compute_salt(user, nonce, amount, token, target);
            let calldata = InternalImpl::_build_constructor_calldata(
                user, nonce, amount, token, target,
            );
            let calldata_hash = InternalImpl::_compute_constructor_hash(calldata.span());
            InternalImpl::_compute_address(salt, self.uda_class_hash.read(), calldata_hash)
        }

        fn deploy_vault(
            ref self: ContractState,
            user: ContractAddress,
            nonce: u128,
            amount: u256,
            token: ContractAddress,
            target: ContractAddress,
        ) -> ContractAddress {
            InternalImpl::_validate(user, amount, token, target);
            let salt = InternalImpl::_compute_salt(user, nonce, amount, token, target);
            let calldata = InternalImpl::_build_constructor_calldata(
                user, nonce, amount, token, target,
            );
            let predicted = {
                let calldata_hash = InternalImpl::_compute_constructor_hash(calldata.span());
                InternalImpl::_compute_address(salt, self.uda_class_hash.read(), calldata_hash)
            };

            let erc20 = IERC20Dispatcher { contract_address: token };
            let balance = erc20.balance_of(predicted);
            assert(balance >= amount, Error::INSUFFICIENT_FUNDS);

            match deploy_syscall(self.uda_class_hash.read(), salt, calldata.span(), false) {
                Result::Ok((
                    deployed, _,
                )) => {
                    self.emit(VaultDeployed { vault: deployed, user, token });
                    deployed
                },
                Result::Err(_e) => {
                    // If already deployed, return predicted address
                    self.emit(VaultDeployed { vault: predicted, user, token });
                    predicted
                },
            }
        }
    }

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn _validate(
            user: ContractAddress, amount: u256, token: ContractAddress, target: ContractAddress,
        ) {
            assert(
                !user.is_zero() && !token.is_zero() && !target.is_zero(), Error::INVALID_ADDRESS,
            );
            assert(amount > 0, Error::ZERO_AMOUNT);
        }

        fn _compute_salt(
            user: ContractAddress,
            nonce: u128,
            amount: u256,
            token: ContractAddress,
            target: ContractAddress,
        ) -> felt252 {
            let mut h = PedersenTrait::new(0);
            h = h.update(user.into());
            h = h.update(nonce.into());
            h = h.update(amount.low.into());
            h = h.update(amount.high.into());
            h = h.update(token.into());
            h = h.update(target.into());
            h.finalize()
        }

        fn _build_constructor_calldata(
            user: ContractAddress,
            nonce: u128,
            amount: u256,
            token: ContractAddress,
            target: ContractAddress,
        ) -> Array<felt252> {
            let mut data: Array<felt252> = ArrayTrait::new();
            data.append(user.into());
            data.append(nonce.into());
            data.append(amount.low.into());
            data.append(amount.high.into());
            data.append(token.into());
            data.append(target.into());
            data
        }

        fn _compute_constructor_hash(data: Span<felt252>) -> felt252 {
            let mut h = PedersenTrait::new(0);
            for v in data {
                h = h.update(*v);
            }
            h.update(data.len().into()).finalize()
        }

        fn _compute_address(
            salt: felt252, class_hash: ClassHash, calldata_hash: felt252,
        ) -> ContractAddress {
            let addr = PedersenTrait::new(0)
                .update('STARKNET_CONTRACT_ADDRESS')
                .update(get_contract_address().into())
                .update(salt)
                .update(class_hash.into())
                .update(calldata_hash)
                .finalize();
            addr.try_into().unwrap()
        }
    }
}

