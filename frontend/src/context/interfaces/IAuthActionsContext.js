/**
 * @typedef {object} LoginCredentials
 * @property {string} identifier
 * @property {string} password
 */

/**
 * @typedef {object} RegistrationData
 * @property {string} email
 * @property {string} password
 * @property {string} firstName
 * @property {string} lastName
 * @property {string|null} phone
 */

/**
 * @typedef {object} IAuthActionsContext
 * @property {(credentials: LoginCredentials) => Promise<boolean>} login
 * @property {() => Promise<void>} logout
 * @property {(userData: RegistrationData) => Promise<boolean>} register
 * @property {(email: string) => Promise<boolean>} resetPassword
 * @property {() => Promise<void>} initializeAuth
 * @property {() => void} clearAuthError
 * @property {(newUserData: Partial<UserProfile>) => Promise<boolean>} updateUser
 */ 