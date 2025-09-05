/**
 * @typedef {object} UserProfile
 * @property {number} id
 * @property {string} email
 * @property {string} first_name
 * @property {string} last_name
 * @property {string|null} phone_number
 * @property {boolean} is_active
 * @property {boolean} is_superuser
 * @property {boolean} is_verified
 */

/**
 * @typedef {object} AuthState
 * @property {UserProfile|null} user - The current user profile.
 * @property {string|null} token - The access token.
 * @property {string|null} refreshToken - The refresh token.
 * @property {boolean} isAuthenticated - Flag indicating if the user is authenticated.
 * @property {boolean} isLoading - Flag indicating if an auth operation is in progress.
 * @property {Error|null} error - Any error that occurred during an auth operation.
 */

/**
 * @typedef {object} IAuthStateContext
 * @property {AuthState} state - The authentication state.
 * @property {function} dispatch - The reducer dispatch function.
 */ 