import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'spms_vit_chennai_secret_key_2026_secure';
const JWT_EXPIRES_IN = '24h';

export const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      githubUsername: user.githubUsername
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
};
