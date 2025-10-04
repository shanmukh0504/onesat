use alexandria_math::i257::i257;
use starknet::{ClassHash, ContractAddress};

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

#[starknet::interface]
pub trait IVesu<TContractState> {
    fn modify_position(
        ref self: TContractState, params: ModifyPositionParams,
    ) -> UpdatePositionResponse;
}

#[derive(PartialEq, Copy, Drop, Serde)]
pub struct UpdatePositionResponse {
    pub collateral_delta: i257, // [asset scale]
    pub collateral_shares_delta: i257, // [SCALE]
    pub debt_delta: i257, // [asset scale]
    pub nominal_debt_delta: i257, // [SCALE]
    pub bad_debt: u256 // [asset scale]
}

#[derive(PartialEq, Copy, Drop, Serde)]
pub struct ModifyPositionParams {
    pub collateral_asset: ContractAddress,
    pub debt_asset: ContractAddress,
    pub user: ContractAddress,
    pub collateral: Amount,
    pub debt: Amount,
}

#[derive(PartialEq, Copy, Drop, Serde, Default)]
pub struct Amount {
    pub denomination: AmountDenomination,
    pub value: i257,
}

#[derive(PartialEq, Copy, Drop, Serde, Default)]
pub enum AmountDenomination {
    #[default]
    Native,
    Assets,
}
