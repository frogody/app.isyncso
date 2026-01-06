/**
 * Entity Exports
 * Provides access to all Supabase database entities
 */
import { base44 } from './base44Client';

// === SkillSync Activity Tracking (receives data from macOS app) ===
export const Activity = base44.entities.Activity;
export const DeepContent = base44.entities.DeepContent;
export const MissingAction = base44.entities.MissingAction;
export const MicroLesson = base44.entities.MicroLesson;
export const ActivitySummary = base44.entities.ActivitySummary;
export const UserProfile = base44.entities.UserProfile;
export const CompanyDataCache = base44.entities.CompanyDataCache;

// === Learning Management ===
export const Course = base44.entities.Course;
export const Module = base44.entities.Module;
export const Lesson = base44.entities.Lesson;
export const UserProgress = base44.entities.UserProgress;
export const Assessment = base44.entities.Assessment;
export const UserResult = base44.entities.UserResult;
export const CourseBuild = base44.entities.CourseBuild;
export const ContentAsset = base44.entities.ContentAsset;
export const CourseVersion = base44.entities.CourseVersion;
export const CourseRating = base44.entities.CourseRating;
export const LessonInteraction = base44.entities.LessonInteraction;

// === Organization ===
export const Company = base44.entities.Company;
export const Department = base44.entities.Department;
export const Invitation = base44.entities.Invitation;
export const Assignment = base44.entities.Assignment;

// === Skills & Learning Paths ===
export const Skill = base44.entities.Skill;
export const CourseSkill = base44.entities.CourseSkill;
export const LearningPath = base44.entities.LearningPath;
export const LearningPathStep = base44.entities.LearningPathStep;
export const SkillsMaster = base44.entities.SkillsMaster;
export const SkillApplication = base44.entities.SkillApplication;
export const LearningIndicator = base44.entities.LearningIndicator;
export const UserSkillProgress = base44.entities.UserSkillProgress;
export const SkillGap = base44.entities.SkillGap;
export const CourseRecommendation = base44.entities.CourseRecommendation;
export const PracticeChallenge = base44.entities.PracticeChallenge;
export const UserSkill = base44.entities.UserSkill;

// === Compliance & Sentinel ===
export const ComplianceRequirement = base44.entities.ComplianceRequirement;
export const RegulatoryDocument = base44.entities.RegulatoryDocument;
export const AISystem = base44.entities.AISystem;
export const Obligation = base44.entities.Obligation;

// === Growth Engine ===
export const Prospect = base44.entities.Prospect;
export const ProspectList = base44.entities.ProspectList;
export const ProspectListMembership = base44.entities.ProspectListMembership;
export const ICPTemplate = base44.entities.ICPTemplate;
export const GrowthMetric = base44.entities.GrowthMetric;
export const GrowthCampaign = base44.entities.GrowthCampaign;
export const GrowthOpportunity = base44.entities.GrowthOpportunity;
export const GrowthSignal = base44.entities.GrowthSignal;

// === Gamification & Achievements ===
export const UserGamification = base44.entities.UserGamification;
export const Badge = base44.entities.Badge;
export const Certificate = base44.entities.Certificate;

// === User & Settings ===
export const UserSettings = base44.entities.UserSettings;
export const UserAppConfig = base44.entities.UserAppConfig;

// === Support ===
export const SupportTicket = base44.entities.SupportTicket;
export const FeatureRequest = base44.entities.FeatureRequest;
export const HelpArticle = base44.entities.HelpArticle;

// === Sync & Sessions ===
export const ActivitySession = base44.entities.ActivitySession;
export const SyncSession = base44.entities.SyncSession;
export const SyncEvent = base44.entities.SyncEvent;
export const SyncAction = base44.entities.SyncAction;

// === Communication ===
export const Channel = base44.entities.Channel;
export const Message = base44.entities.Message;

// === Integrations & Actions ===
export const MergeIntegration = base44.entities.MergeIntegration;
export const ActionLog = base44.entities.ActionLog;
export const MasterPromptTemplate = base44.entities.MasterPromptTemplate;

// === CIDE (Content IDE) ===
export const CIDEDraft = base44.entities.CIDEDraft;

// === Finance ===
export const Expense = base44.entities.Expense;
export const Invoice = base44.entities.Invoice;
export const Subscription = base44.entities.Subscription;

// === Raise (Fundraising) ===
export const RaiseCampaign = base44.entities.RaiseCampaign;
export const RaiseInvestor = base44.entities.RaiseInvestor;
export const RaisePitchDeck = base44.entities.RaisePitchDeck;
export const RaiseDataRoom = base44.entities.RaiseDataRoom;

// === Products ===
export const Product = base44.entities.Product;
export const DigitalProduct = base44.entities.DigitalProduct;
export const PhysicalProduct = base44.entities.PhysicalProduct;
export const Supplier = base44.entities.Supplier;
export const ProductCategory = base44.entities.ProductCategory;

// === Auth SDK ===
export const User = base44.auth;
