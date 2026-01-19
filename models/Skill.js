const mongoose = require('mongoose');

const skillSchema = new mongoose.Schema({
    // Skill name
    name: {
        type: String,
        required: [true, 'Skill name is required'],
        unique: true,
        trim: true,
        maxlength: [100, 'Skill name cannot exceed 100 characters']
    },
    
    // Category/Domain
    category: {
        type: String,
        required: [true, 'Skill category is required'],
        enum: [
            'Programming',
            'Web Development',
            'Mobile Development',
            'Data Science',
            'Machine Learning',
            'Cloud Computing',
            'DevOps',
            'Cybersecurity',
            'UI/UX Design',
            'Graphic Design',
            'Digital Marketing',
            'Business',
            'Soft Skills',
            'Other'
        ]
    },
    
    // Description
    description: {
        type: String,
        maxlength: [500, 'Description cannot exceed 500 characters']
    },
    
    // Popularity/Usage count
    popularity: {
        type: Number,
        default: 0,
        min: 0
    },
    
    // Status
    isActive: {
        type: Boolean,
        default: true
    },
    
    // Related skills (optional)
    relatedSkills: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Skill'
    }],
    
    // Admin who created/added the skill
    createdBy: {
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
skillSchema.pre('save', function() {
    this.updatedAt = Date.now();
});

// Create indexes for better query performance
skillSchema.index({ category: 1, popularity: -1 });
skillSchema.index({ isActive: 1 });
skillSchema.index({ popularity: -1 });

const Skill = mongoose.model('Skill', skillSchema);

module.exports = Skill;
