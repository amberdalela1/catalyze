import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database';

export class User extends Model {
  declare id: number;
  declare email: string | null;
  declare phone: string | null;
  declare passwordHash: string | null;
  declare name: string;
  declare role: 'user' | 'admin';
  declare avatarUrl: string | null;
  declare googleId: string | null;
  declare appleId: string | null;
  declare createdAt: Date;
  declare updatedAt: Date;
}

User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING(255),
      unique: true,
      allowNull: true,
    },
    phone: {
      type: DataTypes.STRING(20),
      unique: true,
      allowNull: true,
    },
    passwordHash: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    role: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'user',
    },
    avatarUrl: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    googleId: {
      type: DataTypes.STRING(255),
      unique: true,
      allowNull: true,
    },
    appleId: {
      type: DataTypes.STRING(255),
      unique: true,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'users',
    timestamps: true,
  }
);

export class Organization extends Model {
  declare id: number;
  declare name: string;
  declare description: string;
  declare mission: string;
  declare category: string;
  declare city: string | null;
  declare state: string | null;
  declare latitude: number | null;
  declare longitude: number | null;
  declare website: string | null;
  declare contactEmail: string | null;
  declare contactPhone: string | null;
  declare registrationNo: string | null;
  declare logoUrl: string | null;
  declare size: 'small' | 'medium' | 'large' | null;
  declare canPost: boolean;
  declare canMessage: boolean;
  declare ownerId: number;
  declare createdAt: Date;
  declare updatedAt: Date;
}

Organization.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    mission: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    category: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    state: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    latitude: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    longitude: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    website: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    contactEmail: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    contactPhone: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    registrationNo: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    logoUrl: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    size: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    canPost: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    canMessage: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    ownerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'organizations',
    timestamps: true,
  }
);

export class Post extends Model {
  declare id: number;
  declare orgId: number;
  declare authorId: number;
  declare title: string;
  declare content: string;
  declare mediaUrl: string | null;
  declare type: 'tip' | 'experience' | 'announcement';
  declare createdAt: Date;
}

Post.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    orgId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    authorId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    mediaUrl: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    type: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'tip',
    },
  },
  {
    sequelize,
    tableName: 'posts',
    timestamps: true,
  }
);

export class Reaction extends Model {
  declare id: number;
  declare postId: number;
  declare userId: number;
}

Reaction.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    postId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'reactions',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['postId', 'userId'] },
    ],
  }
);

export class Partnership extends Model {
  declare id: number;
  declare requesterId: number;
  declare targetId: number;
  declare status: 'pending' | 'accepted' | 'declined';
  declare message: string | null;
  declare createdAt: Date;
}

Partnership.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    requesterId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    targetId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'pending',
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'partnerships',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['requesterId', 'targetId'] },
    ],
  }
);

export class FeedRecommendation extends Model {
  declare id: number;
  declare orgId: number;
  declare recommendedOrgId: number;
  declare score: number;
  declare reason: string;
  declare generatedAt: Date;
}

FeedRecommendation.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    orgId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    recommendedOrgId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    score: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    generatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'feed_recommendations',
    timestamps: false,
  }
);

export class PhoneOTP extends Model {
  declare id: number;
  declare phone: string;
  declare code: string;
  declare expiresAt: Date;
  declare used: boolean;
}

PhoneOTP.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    code: {
      type: DataTypes.STRING(6),
      allowNull: false,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    used: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    sequelize,
    tableName: 'phone_otps',
    timestamps: true,
  }
);

export class Favorite extends Model {
  declare id: number;
  declare userId: number;
  declare orgId: number;
  declare createdAt: Date;
}

Favorite.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    orgId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'favorites',
    timestamps: true,
    updatedAt: false,
    indexes: [
      { unique: true, fields: ['userId', 'orgId'] },
    ],
  }
);

export class Message extends Model {
  declare id: number;
  declare senderOrgId: number;
  declare receiverOrgId: number;
  declare content: string;
  declare readAt: Date | null;
  declare createdAt: Date;
}

Message.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    senderOrgId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    receiverOrgId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    readAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'messages',
    timestamps: true,
    updatedAt: false,
    indexes: [
      { fields: ['senderOrgId', 'receiverOrgId'] },
      { fields: ['receiverOrgId'] },
    ],
  }
);

export class Media extends Model {
  declare id: number;
  declare orgId: number | null;
  declare postId: number | null;
  declare url: string;
  declare type: 'image' | 'video';
  declare caption: string | null;
  declare displayOrder: number;
  declare createdAt: Date;
}

Media.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    orgId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    postId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    url: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    type: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: 'image',
    },
    caption: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    displayOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    tableName: 'media',
    timestamps: true,
    updatedAt: false,
  }
);

export class OrgResource extends Model {
  declare id: number;
  declare orgId: number;
  declare resource: string;
  declare direction: 'offer' | 'need';
  declare isCustom: boolean;
}

OrgResource.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    orgId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    resource: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    direction: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    isCustom: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    sequelize,
    tableName: 'org_resources',
    timestamps: true,
    updatedAt: false,
    indexes: [
      { fields: ['orgId', 'direction'] },
      { unique: true, fields: ['orgId', 'resource', 'direction'] },
    ],
  }
);

// Associations
User.hasOne(Organization, { foreignKey: 'ownerId', as: 'organization' });
Organization.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });

Organization.hasMany(Post, { foreignKey: 'orgId', as: 'posts' });
Post.belongsTo(Organization, { foreignKey: 'orgId', as: 'organization' });

User.hasMany(Post, { foreignKey: 'authorId', as: 'posts' });
Post.belongsTo(User, { foreignKey: 'authorId', as: 'author' });

Post.hasMany(Reaction, { foreignKey: 'postId', as: 'reactions' });
Reaction.belongsTo(Post, { foreignKey: 'postId' });
User.hasMany(Reaction, { foreignKey: 'userId' });
Reaction.belongsTo(User, { foreignKey: 'userId' });

Organization.hasMany(Partnership, { foreignKey: 'requesterId', as: 'sentPartnerships' });
Organization.hasMany(Partnership, { foreignKey: 'targetId', as: 'receivedPartnerships' });
Partnership.belongsTo(Organization, { foreignKey: 'requesterId', as: 'requester' });
Partnership.belongsTo(Organization, { foreignKey: 'targetId', as: 'target' });

Organization.hasMany(FeedRecommendation, { foreignKey: 'orgId' });
FeedRecommendation.belongsTo(Organization, { foreignKey: 'orgId', as: 'organization' });
FeedRecommendation.belongsTo(Organization, { foreignKey: 'recommendedOrgId', as: 'recommendedOrg' });

User.hasMany(Favorite, { foreignKey: 'userId', as: 'favorites' });
Favorite.belongsTo(User, { foreignKey: 'userId' });
Organization.hasMany(Favorite, { foreignKey: 'orgId' });
Favorite.belongsTo(Organization, { foreignKey: 'orgId', as: 'organization' });

Organization.hasMany(Message, { foreignKey: 'senderOrgId', as: 'sentMessages' });
Organization.hasMany(Message, { foreignKey: 'receiverOrgId', as: 'receivedMessages' });
Message.belongsTo(Organization, { foreignKey: 'senderOrgId', as: 'senderOrg' });
Message.belongsTo(Organization, { foreignKey: 'receiverOrgId', as: 'receiverOrg' });

Organization.hasMany(Media, { foreignKey: 'orgId', as: 'media' });
Media.belongsTo(Organization, { foreignKey: 'orgId' });
Post.hasMany(Media, { foreignKey: 'postId', as: 'media' });
Media.belongsTo(Post, { foreignKey: 'postId' });

Organization.hasMany(OrgResource, { foreignKey: 'orgId', as: 'resources' });
OrgResource.belongsTo(Organization, { foreignKey: 'orgId' });
