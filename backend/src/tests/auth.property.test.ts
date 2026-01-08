/**
 * Property-Based Tests for User Authentication
 * Feature: 3d-printing-consumables-manager, Property 1: User Authentication Round-Trip
 * Validates: Requirements 1.1, 1.2
 *
 * Property: For any valid email and password combination, registering a user
 * and then logging in with the same credentials should return a valid session
 * that grants access to the user's data.
 */

import * as fc from 'fast-check';
import { AuthService } from '../services/auth.service';

// Arbitrary for generating valid email addresses
const validEmailArb = fc
  .tuple(
    fc.stringMatching(/^[a-z][a-z0-9]{2,10}$/), // local part
    fc.stringMatching(/^[a-z]{3,8}$/), // domain
    fc.constantFrom('com', 'org', 'net', 'io') // tld
  )
  .map(([local, domain, tld]) => `${local}@${domain}.${tld}`);

// Arbitrary for generating valid passwords (min 6 chars)
const validPasswordArb = fc.stringMatching(/^[a-zA-Z0-9!@#$%^&*]{6,20}$/);

// Arbitrary for generating valid names
const validNameArb = fc.stringMatching(/^[A-Za-z][A-Za-z ]{1,30}$/);

describe('Property 1: User Authentication Round-Trip', () => {
  /**
   * Property: For any valid email, password, and name combination,
   * registering a user and then logging in with the same credentials
   * should return a valid session that grants access to the user's data.
   */
  it('should allow login with registered credentials and return valid user data', async () => {
    await fc.assert(
      fc.asyncProperty(
        validEmailArb,
        validPasswordArb,
        validNameArb,
        async (email, password, name) => {
          // Step 1: Register a new user
          const registerResult = await AuthService.register({ email, password, name });

          // Verify registration returns user and token
          expect(registerResult.user).toBeDefined();
          expect(registerResult.user.email).toBe(email);
          expect(registerResult.user.name).toBe(name);
          expect(registerResult.token).toBeDefined();
          expect(typeof registerResult.token).toBe('string');

          // Step 2: Login with the same credentials
          const loginResult = await AuthService.login({ email, password });

          // Verify login returns same user data
          expect(loginResult.user).toBeDefined();
          expect(loginResult.user.id).toBe(registerResult.user.id);
          expect(loginResult.user.email).toBe(email);
          expect(loginResult.user.name).toBe(name);
          expect(loginResult.token).toBeDefined();

          // Step 3: Verify token grants access to user data
          const payload = AuthService.verifyToken(loginResult.token);
          expect(payload).not.toBeNull();
          expect(payload?.userId).toBe(registerResult.user.id);
          expect(payload?.email).toBe(email);

          // Step 4: Verify getUserById returns correct data
          const userData = await AuthService.getUserById(registerResult.user.id);
          expect(userData.id).toBe(registerResult.user.id);
          expect(userData.email).toBe(email);
          expect(userData.name).toBe(name);
        }
      ),
      { numRuns: 3 }
    );
  });

  /**
   * Property: For any registered user, logging in with incorrect password
   * should fail with an error.
   */
  it('should reject login with incorrect password', async () => {
    await fc.assert(
      fc.asyncProperty(
        validEmailArb,
        validPasswordArb,
        validPasswordArb,
        validNameArb,
        async (email, correctPassword, wrongPassword, name) => {
          // Skip if passwords happen to be the same
          fc.pre(correctPassword !== wrongPassword);

          // Register user with correct password
          await AuthService.register({ email, password: correctPassword, name });

          // Attempt login with wrong password should fail
          await expect(AuthService.login({ email, password: wrongPassword })).rejects.toThrow(
            'Invalid email or password'
          );
        }
      ),
      { numRuns: 3 }
    );
  });

  /**
   * Property: Registering with an already used email should fail.
   */
  it('should reject duplicate email registration', async () => {
    await fc.assert(
      fc.asyncProperty(
        validEmailArb,
        validPasswordArb,
        validPasswordArb,
        validNameArb,
        validNameArb,
        async (email, password1, password2, name1, name2) => {
          // Register first user
          await AuthService.register({ email, password: password1, name: name1 });

          // Attempt to register second user with same email should fail
          await expect(
            AuthService.register({ email, password: password2, name: name2 })
          ).rejects.toThrow('Email already in use');
        }
      ),
      { numRuns: 3 }
    );
  });
});
