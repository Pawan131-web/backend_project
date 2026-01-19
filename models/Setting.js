const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
    // Setting key (unique identifier)
    key: {
        type: String,
        required: [true, 'Setting key is required'],
        unique: true,
        trim: true,
        lowercase: true
    },
    
    // Setting value (stored as string, parsed based on type)
    value: {
        type: mongoose.Schema.Types.Mixed,
        required: [true, 'Setting value is required']
    },
    
    // Data type of the value
    type: {
        type: String,
        enum: ['string', 'number', 'boolean', 'json', 'array'],
        default: 'string'
    },
    
    // Category for grouping settings
    category: {
        type: String,
        enum: [
            'general',
            'email',
            'security',
            'features',
            'limits',
            'maintenance',
            'notifications',
            'other'
        ],
        default: 'general'
    },
    
    // Description of what this setting does
    description: {
        type: String,
        maxlength: [500, 'Description cannot exceed 500 characters']
    },
    
    // Whether this setting is publicly accessible (non-admin users)
    isPublic: {
        type: Boolean,
        default: false
    },
    
    // Whether this setting can be modified
    isEditable: {
        type: Boolean,
        default: true
    },
    
    // Default value (for reference)
    defaultValue: {
        type: mongoose.Schema.Types.Mixed
    },
    
    // Admin who last updated
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin'
    },
    
    // Timestamps
    createdAt: {
        type: Date,
        default: Date.now
    },
    
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update the updatedAt timestamp before saving
settingSchema.pre('save', function() {
    this.updatedAt = Date.now();
});

// Create indexes for better query performance
settingSchema.index({ category: 1 });
settingSchema.index({ isPublic: 1 });

const Setting = mongoose.model('Setting', settingSchema);

module.exports = Setting;
