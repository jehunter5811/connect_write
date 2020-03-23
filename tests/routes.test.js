const app = require('../server');
const supertest = require('supertest');
const request = supertest(app);
const testUserGood = {
  email: "fakeemail@email.com", 
  password: "12345678"
}
const testUserBadPass = {
  email: "fakeemail@email.com", 
  password: "1234568"
}

describe('User Endpoints', () => {
  beforeEach(async () => {
    //  Think about what should happen here
  });
  afterEach(async () => {
    //  Think about what should happen here
  });
  it('should register a new user', () => {
    try {
      request(app)
        .post('/v1/users')
        .send(testUserGood);
      expect(response.statusCode).toEqual(200)
      expect(response.body).toHaveProperty('token')
    } catch (error) {
      console.log(error.message)
    }
  })
})