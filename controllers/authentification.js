// const crypto = require('crypto');
const { promisify } = require('util');

const jwt = require('jsonwebtoken');

const User = require('./../models/User');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/AppError');
// const sendEmail = require('./../utils/email');

// Return token signed with ID
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  const cookieOptions = {
    expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000),
    // secure: true, // cookie only sent on secure connection : https
    httpOnly: true,
  };

  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

  // to send a cookie, attach it to the response object, jwt is the name of the cookie
  res.cookie('jwt', token, cookieOptions);

  // remove password, _id and __v from output
  userOutput = { id: user.id, email: user.email, role: user.role, username: user.username };

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user: userOutput,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  // DO NOT USE User.create({req.body}); ! anyone can enter a role or any other data
  // const newUser = await User.create({req.body});

  const newUser = await User.create({
    username: req.body.username,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
  });

  createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  console.log(req.body);
  const { email, password } = req.body;

  // 1) Check if email and password exist
  if (!email || !password) {
    return next(new AppError('Please provide email and password ! ', 400));
  }

  // 2) Check if user exists && password is correct
  // Find user and the password field
  const user = await User.findOne({ email }).select('+password');

  // if user doesn't exist or password is incorrect
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }

  createSendToken(user, 200, res);
});

// Middleware to protect a route that needs valid token
exports.protect = catchAsync(async (req, res, next) => {
  // 1) Get token if exists and it's value starts with 'Bearer' (convention)
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  // console.log(token);

  // Check token, send an error
  if (!token) {
    return next(new AppError('You are not logged in!', 401));
  }

  // 2) Validate/Verification token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3) Check if user still exists
  const freshUser = await User.findById(decoded.id);
  if (!freshUser) {
    return next(new AppError('The user belonging to this token does no longer exist', 401));
  }

  // 4) Check if user changed password after the token was issued
  // if (freshUser.changedPasswordAfter(decoded.iat)) {
  //   return next(new AppError('User recently changed password! Please log in again', 401));
  // }

  // Grand access to protected route
  // put the user data on the request
  req.user = freshUser;
  next();
});

/**
 * Wrapper function that returns a middleware function
 * Middleware that restricts a route depending on user's role
 */
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // roles ['admin','lead-guide']
    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }
    next();
  };
};

// exports.forgotPassword = catchAsync(async (req, res, next) => {
//   // 1) Get user based on posted email
//   const user = await User.findOne({ email: req.body.email });
//   if (!user) {
//     return next(new AppError('There is no user with email address', 404));
//   }

//   // 2) Generate the random reset token
//   const resetToken = user.createPasswordResetToken();
//   // deactivate all the validators in the schema and save new encrypted token in DB
//   await user.save({ validateBeforeSave: false });

//   // 3) Send it to user's email
//   const resetURL = `${req.protocol}://${req.get(
//     'host'
//   )}/api/v1/users/reset-password/${resetToken}`;

//   const message = `Forgot your password ? Submit a patch request with your new password and passwordConfirm to : ${resetURL}`;

//   try {
//     await sendEmail({
//       email: user.email,
//       subject: 'Your password reset token (valid for 10 minutes)',
//       message
//     });
//   } catch (err) {
//     user.passwordResetToken = undefined;
//     user.passwordResetExpires = undefined;
//     await user.save({ validateBeforeSave: false });
//     return next(new AppError('There was an error sending the email', 500));
//   }

//   res.status(200).json({ status: 'success', message: 'Token sent to email' });
// });

// exports.resetPassword = catchAsync(async (req, res, next) => {
//   // 1) Get user based on the token
//   // hash token from route : userRouter.patch('/resetPassword/:token', authController.resetPassword);
//   const hashedToken = crypto
//     .createHash('sha256')
//     .update(req.params.token)
//     .digest('hex');

//   // Get the user based on the hashedToken. If token has expired (greater than Date.now()) then the request doesn't return any user
//   const user = await User.findOne({
//     passwordResetToken: hashedToken,
//     passwordResetExpires: { $gt: Date.now() }
//   });

//   // 2) If token has not expired, and there is user, set the new password
//   if (!user) {
//     return next(new AppError('Token is invalid or has expired', 404));
//   }

//   // update password
//   user.password = req.body.password;
//   user.passwordConfirm = req.body.passwordConfirm;
//   user.passwordResetToken = undefined;
//   user.passwordResetExpires = undefined;
//   await user.save(); // use save to run all the validators

//   // 3) Update changePasswordAt property for the user (use a middleware in user model)

//   // 4) Log the user in, send JWT
//   createSendToken(user, 200, res);
// });

// exports.updatePassword = catchAsync(async (req, res, next) => {
//   // 1) Get user from collection
//   const user = await User.findById(req.user.id).select('+password');

//   // 2) Check if POSTed password is correct
//   if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
//     return next(new AppError('Your current password is wrong', 401));
//   }

//   // 3) If password is correct, update password
//   user.password = req.body.password;
//   user.passwordConfirm = req.body.passwordConfirm;
//   await user.save();
//   const userClean = {
//     role: user.role,
//     name: user.name,
//     email: user.email
//   };
//   console.log(userClean);
//   // 4) Log user in, send JWT
//   createSendToken(userClean, 200, res);
// });
