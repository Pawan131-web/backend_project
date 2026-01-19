/**
 * Skill-Based Recommendation Engine
 * Calculates match percentages between students and internships
 */

// Skill level numeric mapping
const SKILL_LEVELS = {
    beginner: 1,
    intermediate: 2,
    advanced: 3,
    expert: 4
};

/**
 * Calculate match score for a single skill comparison
 * @param {number} studentLevel - Student's skill level (1-4)
 * @param {number} requiredLevel - Required skill level (1-4)
 * @returns {number} Match score (0-100)
 */
function calculateSkillMatchScore(studentLevel, requiredLevel) {
    if (!studentLevel || studentLevel === 0) {
        return 0; // Skill missing
    }
    
    const diff = studentLevel - requiredLevel;
    
    if (diff === 0) return 100;      // Same level
    if (diff >= 1) return 90;         // One or more levels higher
    if (diff === -1) return 70;       // One level lower
    if (diff === -2) return 40;       // Two levels lower
    return 20;                        // Three or more levels lower
}

/**
 * Get numeric value for skill level string
 * @param {string} level - Skill level string
 * @returns {number} Numeric value (1-4)
 */
function getSkillLevelValue(level) {
    if (!level) return 0;
    const normalizedLevel = String(level).toLowerCase().trim();
    return SKILL_LEVELS[normalizedLevel] || 0;
}

/**
 * Normalize skill name for comparison
 * @param {string} name - Skill name
 * @returns {string} Normalized skill name
 */
function normalizeSkillName(name) {
    if (!name) return '';
    return String(name).toLowerCase().trim().replace(/[^a-z0-9+#]/g, '');
}

/**
 * Calculate match percentage between student skills and internship requirements
 * @param {Array} studentSkills - Array of student skills [{name, level}]
 * @param {Array} internshipSkills - Array of internship required skills [{name, level}]
 * @returns {Object} Match result {percentage, matchedSkills, missingSkills, details}
 */
function calculateMatchPercentage(studentSkills, internshipSkills) {
    // Handle edge cases
    if (!internshipSkills || internshipSkills.length === 0) {
        return {
            percentage: 100,
            matchedSkills: [],
            missingSkills: [],
            details: [],
            message: 'No specific skills required'
        };
    }
    
    if (!studentSkills || studentSkills.length === 0) {
        return {
            percentage: 0,
            matchedSkills: [],
            missingSkills: internshipSkills.map(s => s.name || s),
            details: [],
            message: 'Student has no skills listed'
        };
    }
    
    // Build student skills map for quick lookup
    const studentSkillsMap = new Map();
    studentSkills.forEach(skill => {
        const name = normalizeSkillName(typeof skill === 'string' ? skill : skill.name);
        const level = typeof skill === 'string' ? 'intermediate' : (skill.level || 'intermediate');
        if (name) {
            studentSkillsMap.set(name, getSkillLevelValue(level));
        }
    });
    
    const details = [];
    const matchedSkills = [];
    const missingSkills = [];
    let totalScore = 0;
    
    // Calculate score for each required skill
    internshipSkills.forEach(reqSkill => {
        const skillName = typeof reqSkill === 'string' ? reqSkill : reqSkill.name;
        const requiredLevel = typeof reqSkill === 'string' ? 'intermediate' : (reqSkill.level || 'intermediate');
        const normalizedName = normalizeSkillName(skillName);
        
        if (!normalizedName) return;
        
        const requiredLevelValue = getSkillLevelValue(requiredLevel);
        const studentLevelValue = studentSkillsMap.get(normalizedName) || 0;
        
        const score = calculateSkillMatchScore(studentLevelValue, requiredLevelValue);
        totalScore += score;
        
        const detail = {
            skill: skillName,
            requiredLevel: requiredLevel,
            studentLevel: studentLevelValue > 0 ? Object.keys(SKILL_LEVELS).find(k => SKILL_LEVELS[k] === studentLevelValue) : 'missing',
            score: score
        };
        details.push(detail);
        
        if (score > 0) {
            matchedSkills.push(skillName);
        } else {
            missingSkills.push(skillName);
        }
    });
    
    const percentage = Math.round(totalScore / internshipSkills.length);
    
    return {
        percentage,
        matchedSkills,
        missingSkills,
        details,
        message: getMatchMessage(percentage)
    };
}

/**
 * Get recommendation level based on percentage
 * @param {number} percentage - Match percentage
 * @returns {string} Recommendation level
 */
function getRecommendationLevel(percentage) {
    if (percentage >= 85) return 'excellent';
    if (percentage >= 70) return 'high';
    if (percentage >= 50) return 'medium';
    if (percentage >= 30) return 'low';
    return 'minimal';
}

/**
 * Get descriptive message for match percentage
 * @param {number} percentage - Match percentage
 * @returns {string} Description message
 */
function getMatchMessage(percentage) {
    if (percentage >= 85) return 'Excellent match! Your skills align very well.';
    if (percentage >= 70) return 'Strong match. You meet most requirements.';
    if (percentage >= 50) return 'Good match. Consider developing missing skills.';
    if (percentage >= 30) return 'Partial match. Some skill gaps to address.';
    return 'Limited match. Significant skill development needed.';
}

/**
 * Calculate recommendations for a student based on their skills
 * @param {Array} studentSkills - Student's skills array
 * @param {Array} internships - Array of internship posts
 * @returns {Array} Sorted array of internships with match data
 */
function getRecommendationsForStudent(studentSkills, internships) {
    if (!internships || internships.length === 0) {
        return [];
    }
    
    const recommendations = internships.map(internship => {
        // Get skills from internship - prefer skillsWithLevels, fallback to skills array
        let internshipSkills = [];
        
        if (internship.skillsWithLevels && internship.skillsWithLevels.length > 0) {
            internshipSkills = internship.skillsWithLevels;
        } else if (internship.skills && internship.skills.length > 0) {
            // Convert simple skills array to objects with default intermediate level
            internshipSkills = internship.skills.map(s => ({
                name: s,
                level: 'intermediate'
            }));
        }
        
        const matchResult = calculateMatchPercentage(studentSkills, internshipSkills);
        
        return {
            ...internship.toObject ? internship.toObject() : internship,
            matchPercentage: matchResult.percentage,
            matchLevel: getRecommendationLevel(matchResult.percentage),
            matchedSkills: matchResult.matchedSkills,
            missingSkills: matchResult.missingSkills,
            matchDetails: matchResult.details,
            matchMessage: matchResult.message
        };
    });
    
    // Sort by match percentage (highest first)
    recommendations.sort((a, b) => b.matchPercentage - a.matchPercentage);
    
    return recommendations;
}

/**
 * Calculate top applicants for an internship based on skill match
 * @param {Object} internship - Internship post with required skills
 * @param {Array} applicants - Array of applicant user objects with skills
 * @returns {Array} Sorted array of applicants with match data
 */
function getTopApplicants(internship, applicants) {
    if (!applicants || applicants.length === 0) {
        return [];
    }
    
    // Get required skills from internship
    let requiredSkills = [];
    if (internship.skillsWithLevels && internship.skillsWithLevels.length > 0) {
        requiredSkills = internship.skillsWithLevels;
    } else if (internship.skills && internship.skills.length > 0) {
        requiredSkills = internship.skills.map(s => ({
            name: s,
            level: 'intermediate'
        }));
    }
    
    const rankedApplicants = applicants.map(applicant => {
        // Get student skills from portfolio data or user skills field
        let studentSkills = [];
        
        if (applicant.portfolioData?.skills?.technical) {
            studentSkills = applicant.portfolioData.skills.technical;
        } else if (applicant.skills) {
            studentSkills = applicant.skills;
        }
        
        const matchResult = calculateMatchPercentage(studentSkills, requiredSkills);
        
        return {
            ...applicant.toObject ? applicant.toObject() : applicant,
            matchPercentage: matchResult.percentage,
            matchLevel: getRecommendationLevel(matchResult.percentage),
            matchedSkills: matchResult.matchedSkills,
            missingSkills: matchResult.missingSkills,
            matchDetails: matchResult.details
        };
    });
    
    // Sort by match percentage (highest first)
    rankedApplicants.sort((a, b) => b.matchPercentage - a.matchPercentage);
    
    return rankedApplicants;
}

/**
 * Organization type to skill domain mapping
 */
const ORG_TYPE_SKILL_DOMAINS = {
    'it': ['javascript', 'python', 'java', 'react', 'nodejs', 'aws', 'docker', 'git', 'sql', 'mongodb', 'typescript', 'angular', 'vue', 'devops', 'kubernetes', 'linux', 'api', 'rest', 'graphql', 'microservices'],
    'technology': ['javascript', 'python', 'java', 'react', 'nodejs', 'aws', 'docker', 'git', 'sql', 'mongodb', 'typescript', 'angular', 'vue', 'devops', 'kubernetes'],
    'finance': ['excel', 'sql', 'python', 'r', 'tableau', 'powerbi', 'accounting', 'financial modeling', 'data analysis', 'bloomberg', 'risk management', 'compliance'],
    'banking': ['excel', 'sql', 'python', 'accounting', 'financial analysis', 'risk management', 'compliance', 'sas', 'data analysis', 'regulatory'],
    'healthcare': ['python', 'r', 'sql', 'healthcare informatics', 'ehr', 'hipaa', 'data analysis', 'medical terminology', 'clinical research'],
    'marketing': ['google analytics', 'seo', 'sem', 'social media', 'content marketing', 'copywriting', 'adobe creative', 'hubspot', 'mailchimp', 'a/b testing'],
    'consulting': ['excel', 'powerpoint', 'data analysis', 'problem solving', 'communication', 'project management', 'sql', 'tableau'],
    'education': ['teaching', 'curriculum development', 'lms', 'communication', 'presentation', 'research', 'educational technology'],
    'manufacturing': ['lean', 'six sigma', 'cad', 'erp', 'supply chain', 'quality control', 'autocad', 'solidworks'],
    'retail': ['inventory management', 'pos systems', 'customer service', 'merchandising', 'excel', 'data analysis', 'crm'],
    'media': ['adobe creative', 'video editing', 'content creation', 'social media', 'copywriting', 'photography', 'seo']
};

/**
 * Check if student skills align with organization type
 * @param {Array} studentSkills - Student's skills array
 * @param {string} orgType - Organization type
 * @returns {Object} Domain alignment result
 */
function checkDomainAlignment(studentSkills, orgType) {
    if (!orgType || !studentSkills || studentSkills.length === 0) {
        return { aligned: false, score: 0, matchedDomainSkills: [] };
    }
    
    const normalizedOrgType = orgType.toLowerCase().trim();
    const domainSkills = ORG_TYPE_SKILL_DOMAINS[normalizedOrgType] || [];
    
    if (domainSkills.length === 0) {
        return { aligned: true, score: 50, matchedDomainSkills: [], message: 'Unknown org type' };
    }
    
    const studentSkillNames = studentSkills.map(s => 
        normalizeSkillName(typeof s === 'string' ? s : s.name)
    );
    
    const matchedDomainSkills = domainSkills.filter(ds => 
        studentSkillNames.some(ss => ss.includes(ds) || ds.includes(ss))
    );
    
    const alignmentScore = Math.round((matchedDomainSkills.length / Math.min(domainSkills.length, 5)) * 100);
    
    return {
        aligned: matchedDomainSkills.length > 0,
        score: Math.min(alignmentScore, 100),
        matchedDomainSkills,
        orgType: normalizedOrgType
    };
}

module.exports = {
    SKILL_LEVELS,
    calculateSkillMatchScore,
    getSkillLevelValue,
    normalizeSkillName,
    calculateMatchPercentage,
    getRecommendationLevel,
    getMatchMessage,
    getRecommendationsForStudent,
    getTopApplicants,
    checkDomainAlignment,
    ORG_TYPE_SKILL_DOMAINS
};
