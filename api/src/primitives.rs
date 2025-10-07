use axum::{Json, http::StatusCode, response::IntoResponse, response::Response as AxumResponse};
use bigdecimal::BigDecimal;
use serde::{Deserialize, Serialize};

/// Status of an API response
///
/// Used to indicate whether an API call was successful or encountered an error.
/// This is included as a top-level field in every response.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum Status {
    /// Operation completed successfully
    Ok,
    /// Operation encountered an error
    Error,
}

/// Standard API response wrapper
///
/// This structure wraps all API responses to provide a consistent format:
/// - `status`: Indicates if the request was successful or encountered an error
/// - `data`: Contains the actual response data when successful
/// - `error`: Contains error details when the request fails
///
/// # Examples
///
/// ```
/// # use crate::api::primitives::{Response, Status};
/// let success = Response::ok("success data");
/// let error = Response::<()>::error("something went wrong");
/// ```
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Response<T> {
    /// Status of the response (Ok or Error)
    pub status: Status,

    /// The response payload when status is Ok
    #[serde(skip_serializing_if = "Option::is_none")]
    pub result: Option<T>,

    /// Error details when status is Error
    /// Only present when an error occurs
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,

    /// The status code of the response
    #[serde(skip)]
    pub status_code: StatusCode,
}

impl<T> Response<T> {
    /// Creates a successful response with the given data
    ///
    /// # Arguments
    ///
    /// * `data` - The data to include in the successful response
    ///
    /// # Returns
    ///
    /// A JSON-wrapped Response with Ok status and the provided data
    pub fn ok(data: T) -> Self {
        Self {
            status: Status::Ok,
            result: Some(data),
            error: None,
            status_code: StatusCode::OK,
        }
    }

    /// Creates an error response with the given error message
    ///
    /// # Arguments
    ///
    /// * `error` - Any type that can be converted to a String
    ///
    /// # Returns
    ///
    /// A JSON-wrapped Response with Error status and the provided error message
    pub fn error<E: ToString>(error: E, status_code: StatusCode) -> Self {
        Self {
            status: Status::Error,
            error: Some(error.to_string()),
            result: None,
            status_code,
        }
    }
}

impl<T> IntoResponse for Response<T>
where
    T: serde::Serialize,
{
    fn into_response(self) -> AxumResponse {
        let status_code = self.status_code;
        let mut response = Json(self).into_response();
        *response.status_mut() = status_code;
        response
    }
}

/// Type alias for API result (success or error)
pub type ApiResult<T> = Result<Response<T>, Response<()>>;

/// Represents a supported asset with its metadata and identifiers.
#[derive(Serialize, Deserialize)]
pub struct Asset {
    /// The display name of the asset (e.g., "Ether").
    pub name: String,
    /// The ticker symbol of the asset (e.g., "ETH").
    pub symbol: String,
    /// The number of decimals the asset uses.
    pub decimals: u8,
    /// The Coingecko ID for price lookup.
    pub coingecko_id: String,
    /// The on-chain address of the asset.
    pub address: String,
    /// The price of the asset.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub price: Option<BigDecimal>,
}
