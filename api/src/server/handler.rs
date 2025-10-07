pub struct HandlerState {}

/// Health check endpoint that returns the service status
///
/// # Returns
/// * A static string indicating the service is online
pub async fn get_health() -> &'static str {
    "Online"
}
