use starknet::ContractAddress;
use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess};

#[starknet::contract]
mod uda {
    use openzeppelin::token::erc20::interface::{IERC20Dispatcher, IERC20DispatcherTrait};
    use starknet::event::EventEmitter;
    use starknet::get_contract_address;
    use vesu::v_token::{IERC4626Dispatcher, IERC4626DispatcherTrait};
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
        pub const NOT_INITIALIZED: felt252 = 'Not initialized';
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
        // Initialize storage
        self.user.write(user);
        self.action.write(action);
        self.amount.write(amount);
        self.token.write(token);
        self.target.write(target);
        self.is_initialized.write(true);

        // Execute action based on action type
        if action == 1 {
            InternalImpl::deposit_vesu(@self, target, amount, token, user);
        }

        self.emit(Initialized { user, token, amount });
    }

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


        fn recover(ref self: ContractState) {
            assert(self.is_initialized.read(), Error::NOT_INITIALIZED);

            let token = self.token.read();
            let erc20 = IERC20Dispatcher { contract_address: token };
            let balance = erc20.balance_of(get_contract_address());

            let user = self.user.read();

            if balance > 0 {
                erc20.transfer(user, balance);
                self.emit(FundsRecovered { token, amount: balance, recipient: user });
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

        fn approve(
            ref self: ContractState,
            token: ContractAddress,
            amount: u256,
            target_address: ContractAddress,
        ) {
            let erc20 = IERC20Dispatcher { contract_address: token };
            erc20.approve(target_address, amount);
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
            let v_token = IERC4626Dispatcher { contract_address: target_address };
            let erc20 = IERC20Dispatcher { contract_address: token };
            erc20
                .approve(
                    target_address,
                    0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff,
                );
            v_token.deposit(amount, user);
        }
    }
}


#[cfg(test)]
mod tests {
    use core::array::ArrayTrait;
    use core::hash::HashStateTrait;
    use core::pedersen::PedersenTrait;
    use core::poseidon::poseidon_hash_span;

    // Test parameters
    const TEST_NAME: felt252 = 'TEST_UDA';
    const TEST_OWNER: felt252 = 123;
    const TEST_CLASS_HASH: felt252 = 456;

    // Constants needed for testing
    const TEST_CONTRACT_ADDRESS_PREFIX: felt252 = 'STARKNET_CONTRACT_ADDRESS';

    #[test]
    fn test_salt_calculation() {
        // Test that the salt calculation is deterministic
        let salt1 = PedersenTrait::new(0).update(TEST_NAME).update(TEST_OWNER).finalize();
        let salt2 = PedersenTrait::new(0).update(TEST_NAME).update(TEST_OWNER).finalize();

        // Same inputs should produce same salt
        assert(salt1 == salt2, 'this salt is bad');

        // Different inputs should produce different salts
        let salt3 = PedersenTrait::new(0).update(TEST_NAME).update(789).finalize();
        assert(salt1 != salt3, 'salt same bro...');
    }

    #[test]
    fn test_calldata_hash_calculation() {
        // Test that the calldata hash calculation is deterministic
        let mut calldata1: Array<felt252> = ArrayTrait::new();
        calldata1.append(TEST_OWNER);

        let mut calldata2: Array<felt252> = ArrayTrait::new();
        calldata2.append(TEST_OWNER);

        // Same calldata should produce same hash
        let hash1 = poseidon_hash_span(calldata1.span());
        let hash2 = poseidon_hash_span(calldata2.span());

        assert(hash1 == hash2, 'hash wrong bro...');
    }

    #[test]
    fn test_address_calculation_components() {
        // Test individual components of the address calculation
        let salt = PedersenTrait::new(0).update(TEST_NAME).update(TEST_OWNER).finalize();
        let mut calldata: Array<felt252> = ArrayTrait::new();
        calldata.append(TEST_OWNER);
        let calldata_hash = poseidon_hash_span(calldata.span());

        // Test that all components are non-zero
        assert(salt != 0, 'Salt is zero');
        assert(calldata_hash != 0, 'Calldata hash is zero');
        assert(TEST_CLASS_HASH != 0, 'Class hash is zero');

        // Test that the final address calculation produces a non-zero result
        let deployer_address: felt252 = 123; // Test deployer address

        let contract_address_hash = PedersenTrait::new(TEST_CONTRACT_ADDRESS_PREFIX)
            .update(deployer_address)
            .update(salt)
            .update(TEST_CLASS_HASH)
            .update(calldata_hash)
            .finalize();

        assert(contract_address_hash != 0, 'Final address hash is zero');
    }
}

