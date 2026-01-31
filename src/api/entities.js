/**
 * Entity Exports
 * Provides access to all Supabase database entities
 */
import { db } from './supabaseClient';

// === SkillSync Activity Tracking (receives data from macOS app) ===
export const Activity = db.entities.Activity;
export const DeepContent = db.entities.DeepContent;
export const MissingAction = db.entities.MissingAction;
export const MicroLesson = db.entities.MicroLesson;
export const ActivitySummary = db.entities.ActivitySummary;
export const UserProfile = db.entities.UserProfile;
export const CompanyDataCache = db.entities.CompanyDataCache;

// === Learning Management ===
export const Course = db.entities.Course;
export const Module = db.entities.Module;
export const Lesson = db.entities.Lesson;
export const UserProgress = db.entities.UserProgress;
export const Assessment = db.entities.Assessment;
export const UserResult = db.entities.UserResult;
export const CourseBuild = db.entities.CourseBuild;
export const ContentAsset = db.entities.ContentAsset;
export const CourseVersion = db.entities.CourseVersion;
export const CourseRating = db.entities.CourseRating;
export const LessonInteraction = db.entities.LessonInteraction;

// === Organization ===
export const Company = db.entities.Company;
export const Department = db.entities.Department;
export const Invitation = db.entities.Invitation;
export const Assignment = db.entities.Assignment;

// === Skills & Learning Paths ===
export const Skill = db.entities.Skill;
export const CourseSkill = db.entities.CourseSkill;
export const LearningPath = db.entities.LearningPath;
export const LearningPathStep = db.entities.LearningPathStep;
export const SkillsMaster = db.entities.SkillsMaster;
export const SkillApplication = db.entities.SkillApplication;
export const LearningIndicator = db.entities.LearningIndicator;
export const UserSkillProgress = db.entities.UserSkillProgress;
export const SkillGap = db.entities.SkillGap;
export const CourseRecommendation = db.entities.CourseRecommendation;
export const PracticeChallenge = db.entities.PracticeChallenge;
export const UserSkill = db.entities.UserSkill;

// === Compliance & Sentinel ===
export const ComplianceRequirement = db.entities.ComplianceRequirement;
export const RegulatoryDocument = db.entities.RegulatoryDocument;
export const AISystem = db.entities.AISystem;
export const Obligation = db.entities.Obligation;

// === Growth Engine ===
export const Prospect = db.entities.Prospect;
export const ProspectList = db.entities.ProspectList;
export const ProspectListMembership = db.entities.ProspectListMembership;
export const ICPTemplate = db.entities.ICPTemplate;
export const GrowthMetric = db.entities.GrowthMetric;
export const GrowthCampaign = db.entities.GrowthCampaign;
export const GrowthOpportunity = db.entities.GrowthOpportunity;
export const GrowthSignal = db.entities.GrowthSignal;

// === Gamification & Achievements ===
export const UserGamification = db.entities.UserGamification;
export const Badge = db.entities.Badge;
export const Certificate = db.entities.Certificate;

// === User & Settings ===
export const UserSettings = db.entities.UserSettings;
export const UserAppConfig = db.entities.UserAppConfig;

// === Support ===
export const SupportTicket = db.entities.SupportTicket;
export const FeatureRequest = db.entities.FeatureRequest;
export const HelpArticle = db.entities.HelpArticle;

// === Sync & Sessions ===
export const ActivitySession = db.entities.ActivitySession;
export const SyncSession = db.entities.SyncSession;
export const SyncEvent = db.entities.SyncEvent;
export const SyncAction = db.entities.SyncAction;

// === Communication ===
export const Channel = db.entities.Channel;
export const Message = db.entities.Message;

// === Integrations & Actions ===
export const MergeIntegration = db.entities.MergeIntegration;
export const ActionLog = db.entities.ActionLog;
export const MasterPromptTemplate = db.entities.MasterPromptTemplate;

// === CIDE (Content IDE) ===
export const CIDEDraft = db.entities.CIDEDraft;

// === Finance ===
export const Expense = db.entities.Expense;
export const Invoice = db.entities.Invoice;
export const Subscription = db.entities.Subscription;

// === Raise (Fundraising) ===
export const RaiseCampaign = db.entities.RaiseCampaign;
export const RaiseInvestor = db.entities.RaiseInvestor;
export const RaisePitchDeck = db.entities.RaisePitchDeck;
export const RaiseDataRoom = db.entities.RaiseDataRoom;

// === Products ===
export const Product = db.entities.Product;
export const DigitalProduct = db.entities.DigitalProduct;
export const PhysicalProduct = db.entities.PhysicalProduct;
export const Supplier = db.entities.Supplier;
export const ProductCategory = db.entities.ProductCategory;
export const ProductBundle = db.entities.ProductBundle;

// === Proposals ===
export const Proposal = db.entities.Proposal;

// === CREATE (Content Creation) ===
export const BrandAssets = db.entities.BrandAssets;
export const GeneratedContent = db.entities.GeneratedContent;
export const RenderJob = db.entities.RenderJob;
export const VideoProject = db.entities.VideoProject;
export const VideoShot = db.entities.VideoShot;

// === Auth SDK ===
export const User = db.auth;
