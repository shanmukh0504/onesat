use starknet::ContractAddress;

#[starknet::interface]
pub trait IRegistry<TContractState> {
    fn predict_address(
        self: @TContractState,
        user: ContractAddress,
        action: u128,
        amount: u256,
        token: ContractAddress,
        target: ContractAddress,
    ) -> ContractAddress;

    fn deploy_vault(
        ref self: TContractState,
        user: ContractAddress,
        action: u128,
        amount: u256,
        token: ContractAddress,
        target: ContractAddress,
    ) -> ContractAddress;
}

// The UDA/Vault constructor ABI for reference
#[starknet::interface]
pub trait IVault<TContractState> {
    fn get_user(self: @TContractState) -> ContractAddress;
    fn get_action(self: @TContractState) -> u128;
    fn get_amount(self: @TContractState) -> u256;
    fn get_token(self: @TContractState) -> ContractAddress;
    fn get_target_address(self: @TContractState) -> ContractAddress;
    fn deposit_vesu(
        self: @TContractState,
        target_address: ContractAddress,
        amount: u256,
        token: ContractAddress,
    );
    fn approve(
        ref self: TContractState,
        token: ContractAddress,
        amount: u256,
        target_address: ContractAddress,
    );
    fn initializer(
        ref self: TContractState,
        user: ContractAddress,
        action: u128,
        amount: u256,
        token: ContractAddress,
        target: ContractAddress,
    );
    fn recover(ref self: TContractState);
}
