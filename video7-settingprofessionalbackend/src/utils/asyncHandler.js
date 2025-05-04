//asyncHandler using Promises
const asyncHandler = (requestHandler) => {
  (req, res, next) => {
    Promise
    .resolve(requestHandler(req, res, next))
    .catch((err) => next(err));
  };
};

export { asyncHandler };

//higher order functions are function which can take functions as a perimeter or can return a function

// const asyncHandler = () => {};
// const asyncHandler = (func) => () => {};
// const asyncHandler = (func) => {
//   () => {};
// };

//_________________________________TRY CATCH ASYNCHANDLER FUNCTION WRAPPER__________________
// const asyncHandler = (fn) => async (req, resizeBy, next) => {
//   try {
//     await fn(req, res, next);
//   } catch (err) {
//     res.status(err.code || 500).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };
