import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Group } from './group.entity';

export enum WidgetPosition {
  BOTTOM_RIGHT = 'bottom_right',
  BOTTOM_LEFT = 'bottom_left',
  TOP_RIGHT = 'top_right',
  TOP_LEFT = 'top_left',
}

export enum WidgetTheme {
  LIGHT = 'light',
  DARK = 'dark',
  AUTO = 'auto',
}

export enum WidgetSize {
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
}

@Entity('widget_brandings')
export class WidgetBranding {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Group, { nullable: false })
  @JoinColumn({ name: 'groupId' })
  group: Group;

  @Column()
  @Index({ unique: true })
  groupId: string;

  // Basic Branding
  @Column({ length: 255, nullable: true })
  brandTitle: string;

  @Column({ type: 'text', nullable: true })
  welcomeMessage: string;

  @Column({ type: 'text', nullable: true })
  offlineMessage: string;

  @Column({ length: 500, nullable: true })
  logoUrl: string;

  @Column({ length: 255, nullable: true })
  companyName: string;

  // Color Customization
  @Column({ length: 7, default: '#0084FF' })
  primaryColor: string;

  @Column({ length: 7, default: '#FFFFFF' })
  secondaryColor: string;

  @Column({ length: 7, default: '#FFFFFF' })
  textColor: string;

  @Column({ length: 7, default: '#000000' })
  headerTextColor: string;

  @Column({ length: 7, default: '#0084FF' })
  buttonColor: string;

  @Column({ length: 7, default: '#FFFFFF' })
  buttonTextColor: string;

  @Column({ length: 7, default: '#F5F5F5' })
  backgroundColor: string;

  @Column({ length: 7, default: '#E8F4FD' })
  agentBubbleColor: string;

  @Column({ length: 7, default: '#0084FF' })
  visitorBubbleColor: string;

  // Font Settings
  @Column({ length: 100, default: 'Arial, sans-serif' })
  fontFamily: string;

  @Column({ type: 'int', default: 14 })
  fontSize: number;

  // Widget Positioning & Display
  @Column({
    type: 'enum',
    enum: WidgetPosition,
    default: WidgetPosition.BOTTOM_RIGHT,
  })
  position: WidgetPosition;

  @Column({
    type: 'enum',
    enum: WidgetSize,
    default: WidgetSize.MEDIUM,
  })
  size: WidgetSize;

  @Column({
    type: 'enum',
    enum: WidgetTheme,
    default: WidgetTheme.LIGHT,
  })
  theme: WidgetTheme;

  // Layout & Styling
  @Column({ type: 'int', default: 8 })
  borderRadius: number;

  @Column({ length: 7, nullable: true })
  borderColor: string;

  @Column({ type: 'int', default: 0 })
  borderWidth: number;

  @Column({ type: 'text', nullable: true })
  customCss: string;

  // Widget Behavior
  @Column({ default: true })
  showAgentAvatar: boolean;

  @Column({ default: true })
  showAgentName: boolean;

  @Column({ default: true })
  showTypingIndicator: boolean;

  @Column({ default: true })
  soundNotificationEnabled: boolean;

  @Column({ default: false })
  autoOpenWidget: boolean;

  @Column({ type: 'int', default: 0 })
  autoOpenDelay: number; // in seconds

  @Column({ default: true })
  showPoweredBy: boolean;

  @Column({ default: true })
  enableFileUpload: boolean;

  @Column({ default: true })
  enableEmojis: boolean;

  // Pre-chat Form Settings
  @Column({ default: false })
  requirePreChatForm: boolean;

  @Column({ default: true })
  preChatFormAskName: boolean;

  @Column({ default: true })
  preChatFormAskEmail: boolean;

  @Column({ default: false })
  preChatFormAskPhone: boolean;

  @Column({ type: 'json', nullable: true })
  preChatFormCustomFields: Record<string, any>;

  // Business Hours
  @Column({ default: false })
  showBusinessHours: boolean;

  @Column({ type: 'json', nullable: true })
  businessHours: Record<string, any>;

  // Language & Localization
  @Column({ length: 10, default: 'en' })
  language: string;

  @Column({ length: 100, default: 'UTC' })
  timezone: string;

  // Custom Messages
  @Column({ type: 'text', nullable: true })
  agentGreeting: string;

  @Column({ type: 'text', nullable: true })
  noAgentsAvailableMessage: string;

  @Column({ type: 'text', nullable: true })
  chatEndedMessage: string;

  // Footer Links
  @Column({ length: 500, nullable: true })
  privacyPolicyUrl: string;

  @Column({ length: 500, nullable: true })
  termsOfServiceUrl: string;

  // Advanced Settings
  @Column({ default: false })
  enableTranscriptEmail: boolean;

  @Column({ default: false })
  enableChatRating: boolean;

  @Column({ type: 'int', default: 10 })
  maxAttachmentSizeMB: number;

  @Column({ type: 'simple-array', nullable: true })
  allowedFileTypes: string[];

  @Column({ default: true })
  showOnMobile: boolean;

  @Column({ default: true })
  showOnDesktop: boolean;

  // Widget Button Customization
  @Column({ length: 255, nullable: true })
  buttonIconUrl: string;

  @Column({ length: 100, nullable: true })
  buttonText: string;

  @Column({ type: 'int', default: 60 })
  buttonSize: number; // in pixels

  // Animation Settings
  @Column({ default: true })
  enableAnimations: boolean;

  @Column({ length: 50, default: 'bounce' })
  openAnimation: string;

  @Column({ length: 50, default: 'fade' })
  closeAnimation: string;

  // Widget Style & Appearance
  @Column({ length: 50, nullable: true })
  maximizedStyle: string;

  @Column({ length: 50, nullable: true })
  minimizedStyle: string;

  @Column({ length: 10, nullable: true })
  maximizedOpacity: string;

  @Column({ length: 7, nullable: true })
  minimizedBarColor: string;

  @Column({ length: 7, nullable: true })
  minimizedBarTextColor: string;

  @Column({ length: 7, nullable: true })
  minimizedIconColor: string;

  @Column({ length: 7, nullable: true })
  systemColor: string;

  @Column({ length: 7, nullable: true })
  customerTextColor: string;

  @Column({ length: 7, nullable: true })
  agentTextColor: string;

  // Widget Positioning
  @Column({ type: 'int', nullable: true })
  sideSpacing: number;

  @Column({ type: 'int', nullable: true })
  bottomSpacing: number;

  @Column({ length: 20, nullable: true })
  visibilityMode: string; // 'always' | 'on-activate' | 'always-hide'

  // Mobile Settings
  @Column({ length: 20, nullable: true })
  mobileMode: string; // 'same' | 'custom'

  @Column({ length: 20, nullable: true })
  mobileWidgetType: string; // 'Bubble' | 'Bar'

  @Column({ length: 20, nullable: true })
  mobilePosition: string; // 'left' | 'right'

  @Column({ type: 'int', nullable: true })
  mobileSideSpacing: number;

  @Column({ type: 'int', nullable: true })
  mobileBottomSpacing: number;

  @Column({ length: 20, nullable: true })
  mobileVisibility: string; // 'always' | 'on-activate' | 'always-hide'

  // Custom Labels & Messages
  @Column({ length: 255, nullable: true })
  minimizedBarLabel: string;

  @Column({ length: 255, nullable: true })
  defaultAgentName: string;

  @Column({ type: 'text', nullable: true })
  chatPlaceholderText: string;

  @Column({ length: 255, nullable: true })
  offlineBarLabel: string;

  @Column({ type: 'text', nullable: true })
  queueMessage: string;

  // Availability Settings
  @Column({ length: 20, nullable: true })
  availabilityMode: string; // 'always' | 'only-accepting'

  @Column({ default: false })
  showOfflineStatus: boolean;

  @Column({ default: false })
  askEmailWhenAway: boolean;

  @Column({ default: true })
  showLogo: boolean;

  // SEO & Metadata
  @Column({ type: 'simple-array', nullable: true })
  allowedDomains: string[];

  @Column({ type: 'text', nullable: true })
  customMetadata: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;

  @Column({ default: false })
  isDeleted: boolean;

  @Column({ default: true })
  isActive: boolean;
}
