const path = require('path');

const Location = require('../models/Location');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

exports.getLocations = catchAsync(async (req, res, next) => {
  const locations = await Location.find();

  res.status(200).json({
    status: 'success',
    count: locations.length,
    data: locations,
  });
});

exports.getLocation = catchAsync(async (req, res, next) => {
  console.log(req.params.id);
  const location = await Location.findById(req.params.id);

  if (!location) {
    return next(new AppError(`Aucune Localisation trouvée avec l'identifiant : ${req.params.id}`, 404));
  }

  res.status(200).json({
    status: 'success',
    data: location,
  });
});

exports.createLocation = catchAsync(async (req, res, next) => {
  const location = await Location.create(req.body);

  res.status(200).json({
    status: 'success',
    data: location,
  });
});

exports.updateLocation = catchAsync(async (req, res, next) => {
  const location = await Location.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!location) {
    return next(new AppError(`Aucune Localisation trouvée avec l'identifiant : ${req.params.id}`, 404));
  }

  res.status(200).json({
    status: 'success',
    data: location,
  });
});

exports.deleteLocation = catchAsync(async (req, res, next) => {
  const location = await Location.findByIdAndDelete(req.params.id);

  if (!location) {
    return next(new AppError(`Aucune Localisation trouvée avec l'identifiant : ${req.params.id}`, 404));
  }

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

exports.uploadImage = catchAsync(async (req, res, next) => {
  const location = await Location.findById(req.params.id);

  if (!location) {
    return next(new AppError(`Aucune Localisation trouvée avec l'identifiant : ${req.params.id}`, 404));
  }

  if (!req.files) {
    return next(new AppError(`Aucun fichier à uploader`, 400));
  }

  const file = req.files.image;
  console.log(file);

  // make sure the file is an image
  if (!file.mimetype.startsWith('image')) {
    return next(new AppError(`File format not valid`, 400));
  }

  // check file size
  if (file.size > process.env.MAX_FILE_UPLOAD) {
    return next(new AppError(`File too big : > 1Mb`, 400));
  }

  // Create custom filename
  file.name = `image_${location._id}${path.parse(file.name).ext}`;

  file.mv(`${process.env.FILE_UPLOAD_PATH}/${file.name}`, async (err) => {
    if (err) {
      console.error(err);
      return next(new AppError(`Problem with file upload`, 500));
    }

    // insert filename into DB
    const location = await Location.findByIdAndUpdate(
      req.params.id,
      { image: file.name },
      {
        new: true,
      }
    );
    res.status(200).json({
      status: 'success',
      data: location,
    });
  });
});

exports.uploadLogo = catchAsync(async (req, res, next) => {
  const location = await Location.findById(req.params.id);

  if (!location) {
    return next(new AppError(`Aucune Localisation trouvée avec l'identifiant : ${req.params.id}`, 404));
  }

  if (!req.files) {
    return next(new AppError(`Aucun fichier à uploader`, 400));
  }

  const file = req.files.logo;
  console.log(file);

  // make sure the file is an image
  if (!file.mimetype.startsWith('image')) {
    return next(new AppError(`File format not valid`, 400));
  }

  // check file size
  if (file.size > process.env.MAX_FILE_UPLOAD) {
    return next(new AppError(`File too big : > 1Mb`, 400));
  }

  // Create custom filename
  file.name = `logo_${location._id}${path.parse(file.name).ext}`;

  file.mv(`${process.env.FILE_UPLOAD_PATH}/${file.name}`, async (err) => {
    if (err) {
      console.error(err);
      return next(new AppError(`Problem with file upload`, 500));
    }

    // insert filename into DB
    const location = await Location.findByIdAndUpdate(
      req.params.id,
      { image: file.name },
      {
        new: true,
      }
    );
    res.status(200).json({
      status: 'success',
      data: location,
    });
  });
});
