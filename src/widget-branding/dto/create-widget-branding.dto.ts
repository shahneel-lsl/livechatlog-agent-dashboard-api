import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsInt,
  IsArray,
  IsUrl,
  IsHexColor,
  Min,
  Max,
  IsObject,
  Matches,
} from 'class-validator';
import {
  WidgetPosition,
  WidgetTheme,
  WidgetSize,
} from '../../database/mysql/widget-branding.entity';

export class CreateWidgetBrandingDto {
  @IsString()
  @IsNotEmpty()
  groupId: string;

  // Basic Branding
  @IsString()
  @IsOptional()
  brandTitle?: string;

  @IsString()
  @IsOptional()
  welcomeMessage?: string;

  @IsString()
  @IsOptional()
  offlineMessage?: string;

  @IsUrl()
  @IsOptional()
  logoUrl?: string;

  @IsString()
  @IsOptional()
  companyName?: string;

  // Color Customization
  @IsHexColor()
  @IsOptional()
  primaryColor?: string;

  @IsHexColor()
  @IsOptional()
  secondaryColor?: string;

  @IsHexColor()
  @IsOptional()
  textColor?: string;

  @IsHexColor()
  @IsOptional()
  headerTextColor?: string;

  @IsHexColor()
  @IsOptional()
  buttonColor?: string;

  @IsHexColor()
  @IsOptional()
  buttonTextColor?: string;

  @IsHexColor()
  @IsOptional()
  backgroundColor?: string;

  @IsHexColor()
  @IsOptional()
  agentBubbleColor?: string;

  @IsHexColor()
  @IsOptional()
  visitorBubbleColor?: string;

  // Font Settings
  @IsString()
  @IsOptional()
  fontFamily?: string;

  @IsInt()
  @Min(10)
  @Max(24)
  @IsOptional()
  fontSize?: number;

  // Widget Positioning & Display
  @IsEnum(WidgetPosition)
  @IsOptional()
  position?: WidgetPosition;

  @IsEnum(WidgetSize)
  @IsOptional()
  size?: WidgetSize;

  @IsEnum(WidgetTheme)
  @IsOptional()
  theme?: WidgetTheme;

  // Layout & Styling
  @IsInt()
  @Min(0)
  @Max(50)
  @IsOptional()
  borderRadius?: number;

  @IsHexColor()
  @IsOptional()
  borderColor?: string;

  @IsInt()
  @Min(0)
  @Max(10)
  @IsOptional()
  borderWidth?: number;

  @IsString()
  @IsOptional()
  customCss?: string;

  // Widget Behavior
  @IsBoolean()
  @IsOptional()
  showAgentAvatar?: boolean;

  @IsBoolean()
  @IsOptional()
  showAgentName?: boolean;

  @IsBoolean()
  @IsOptional()
  showTypingIndicator?: boolean;

  @IsBoolean()
  @IsOptional()
  soundNotificationEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  autoOpenWidget?: boolean;

  @IsInt()
  @Min(0)
  @IsOptional()
  autoOpenDelay?: number;

  @IsBoolean()
  @IsOptional()
  showPoweredBy?: boolean;

  @IsBoolean()
  @IsOptional()
  enableFileUpload?: boolean;

  @IsBoolean()
  @IsOptional()
  enableEmojis?: boolean;

  // Pre-chat Form Settings
  @IsBoolean()
  @IsOptional()
  requirePreChatForm?: boolean;

  @IsBoolean()
  @IsOptional()
  preChatFormAskName?: boolean;

  @IsBoolean()
  @IsOptional()
  preChatFormAskEmail?: boolean;

  @IsBoolean()
  @IsOptional()
  preChatFormAskPhone?: boolean;

  @IsObject()
  @IsOptional()
  preChatFormCustomFields?: Record<string, any>;

  // Business Hours
  @IsBoolean()
  @IsOptional()
  showBusinessHours?: boolean;

  @IsObject()
  @IsOptional()
  businessHours?: Record<string, any>;

  // Language & Localization
  @IsString()
  @Matches(/^[a-z]{2}(-[A-Z]{2})?$/)
  @IsOptional()
  language?: string;

  @IsString()
  @IsOptional()
  timezone?: string;

  // Custom Messages
  @IsString()
  @IsOptional()
  agentGreeting?: string;

  @IsString()
  @IsOptional()
  noAgentsAvailableMessage?: string;

  @IsString()
  @IsOptional()
  chatEndedMessage?: string;

  // Footer Links
  @IsUrl()
  @IsOptional()
  privacyPolicyUrl?: string;

  @IsUrl()
  @IsOptional()
  termsOfServiceUrl?: string;

  // Advanced Settings
  @IsBoolean()
  @IsOptional()
  enableTranscriptEmail?: boolean;

  @IsBoolean()
  @IsOptional()
  enableChatRating?: boolean;

  @IsInt()
  @Min(1)
  @Max(50)
  @IsOptional()
  maxAttachmentSizeMB?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  allowedFileTypes?: string[];

  @IsBoolean()
  @IsOptional()
  showOnMobile?: boolean;

  @IsBoolean()
  @IsOptional()
  showOnDesktop?: boolean;

  // Widget Button Customization
  @IsUrl()
  @IsOptional()
  buttonIconUrl?: string;

  @IsString()
  @IsOptional()
  buttonText?: string;

  @IsInt()
  @Min(40)
  @Max(100)
  @IsOptional()
  buttonSize?: number;

  // Animation Settings
  @IsBoolean()
  @IsOptional()
  enableAnimations?: boolean;

  @IsString()
  @IsOptional()
  openAnimation?: string;

  @IsString()
  @IsOptional()
  closeAnimation?: string;

  // Widget Style & Appearance
  @IsString()
  @IsOptional()
  maximizedStyle?: string;

  @IsString()
  @IsOptional()
  minimizedStyle?: string;

  @IsString()
  @IsOptional()
  maximizedOpacity?: string;

  @IsHexColor()
  @IsOptional()
  minimizedBarColor?: string;

  @IsHexColor()
  @IsOptional()
  minimizedBarTextColor?: string;

  @IsHexColor()
  @IsOptional()
  minimizedIconColor?: string;

  @IsHexColor()
  @IsOptional()
  systemColor?: string;

  @IsHexColor()
  @IsOptional()
  customerTextColor?: string;

  @IsHexColor()
  @IsOptional()
  agentTextColor?: string;

  // Widget Positioning
  @IsInt()
  @Min(0)
  @IsOptional()
  sideSpacing?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  bottomSpacing?: number;

  @IsString()
  @IsOptional()
  visibilityMode?: string;

  // Mobile Settings
  @IsString()
  @IsOptional()
  mobileMode?: string;

  @IsString()
  @IsOptional()
  mobileWidgetType?: string;

  @IsString()
  @IsOptional()
  mobilePosition?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  mobileSideSpacing?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  mobileBottomSpacing?: number;

  @IsString()
  @IsOptional()
  mobileVisibility?: string;

  // Custom Labels & Messages
  @IsString()
  @IsOptional()
  minimizedBarLabel?: string;

  @IsString()
  @IsOptional()
  defaultAgentName?: string;

  @IsString()
  @IsOptional()
  chatPlaceholderText?: string;

  @IsString()
  @IsOptional()
  offlineBarLabel?: string;

  @IsString()
  @IsOptional()
  queueMessage?: string;

  // Availability Settings
  @IsString()
  @IsOptional()
  availabilityMode?: string;

  @IsBoolean()
  @IsOptional()
  showOfflineStatus?: boolean;

  @IsBoolean()
  @IsOptional()
  askEmailWhenAway?: boolean;

  @IsBoolean()
  @IsOptional()
  showLogo?: boolean;

  // SEO & Metadata
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  allowedDomains?: string[];

  @IsString()
  @IsOptional()
  customMetadata?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
