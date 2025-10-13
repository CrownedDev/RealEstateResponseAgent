const Property = require('../models/Property');
const { AppError } = require('../middleware/errorHandler');

// @desc    Get all properties for agent
// @route   GET /api/v1/properties
// @access  Private
const getProperties = async (req, res, next) => {
  try {
    const { status, type, minPrice, maxPrice, bedrooms, city } = req.query;

    const query = {
      agentId: req.agentId,
      deletedAt: null,
    };

    // Apply filters
    if (status) query.status = status;
    if (type) query.type = type;
    if (bedrooms) query.bedrooms = parseInt(bedrooms);
    if (city) query['address.city'] = new RegExp(city, 'i');
    if (minPrice || maxPrice) {
      query['price.amount'] = {};
      if (minPrice) query['price.amount'].$gte = parseInt(minPrice);
      if (maxPrice) query['price.amount'].$lte = parseInt(maxPrice);
    }

    const properties = await Property.find(query)
      .sort({ createdAt: -1 })
      .select('-__v');

    res.json({
      success: true,
      count: properties.length,
      data: properties,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single property
// @route   GET /api/v1/properties/:id
// @access  Private
const getProperty = async (req, res, next) => {
  try {
    const property = await Property.findOne({
      _id: req.params.id,
      agentId: req.agentId,
      deletedAt: null,
    });

    if (!property) {
      return next(new AppError('Property not found', 404));
    }

    res.json({
      success: true,
      data: property,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create property
// @route   POST /api/v1/properties
// @access  Private
const createProperty = async (req, res, next) => {
  try {
    const propertyData = {
      ...req.body,
      agentId: req.agentId,
    };

    const property = await Property.create(propertyData);

    res.status(201).json({
      success: true,
      message: 'Property created successfully',
      data: property,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update property
// @route   PATCH /api/v1/properties/:id
// @access  Private
const updateProperty = async (req, res, next) => {
  try {
    const property = await Property.findOne({
      _id: req.params.id,
      agentId: req.agentId,
      deletedAt: null,
    });

    if (!property) {
      return next(new AppError('Property not found', 404));
    }

    Object.assign(property, req.body);
    await property.save();

    res.json({
      success: true,
      message: 'Property updated successfully',
      data: property,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete property (soft delete)
// @route   DELETE /api/v1/properties/:id
// @access  Private
const deleteProperty = async (req, res, next) => {
  try {
    const property = await Property.findOne({
      _id: req.params.id,
      agentId: req.agentId,
      deletedAt: null,
    });

    if (!property) {
      return next(new AppError('Property not found', 404));
    }

    property.deletedAt = new Date();
    await property.save();

    res.json({
      success: true,
      message: 'Property deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Search properties (for chatbot)
// @route   POST /api/v1/properties/search
// @access  Private
const searchProperties = async (req, res, next) => {
  try {
    const { bedrooms, maxPrice, location, type } = req.body;

    const query = {
      agentId: req.agentId,
      status: 'available',
      deletedAt: null,
    };

    if (bedrooms) query.bedrooms = bedrooms;
    if (type) query.type = type;
    if (maxPrice) query['price.amount'] = { $lte: maxPrice };
    if (location) {
      query.$or = [
        { 'address.city': new RegExp(location, 'i') },
        { 'address.postcode': new RegExp(location, 'i') },
      ];
    }

    const properties = await Property.find(query)
      .limit(10)
      .select(
        'title address bedrooms bathrooms price features epcRating images'
      )
      .sort({ 'price.amount': 1 });

    res.json({
      success: true,
      count: properties.length,
      data: properties,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProperties,
  getProperty,
  createProperty,
  updateProperty,
  deleteProperty,
  searchProperties,
};
