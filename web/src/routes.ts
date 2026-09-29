/* Generated from ../../project/Tarmem.dc.html by tools/convert-template.py.
   Edit the design file and re-run the converter, or edit here and keep both in
   step — the markup is a mechanical port of the prototype's template. */

import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import type { VM } from './state/viewModel';
import HomePage from './pages/HomePage';
import HowPage from './pages/HowPage';
import PricingPage from './pages/PricingPage';
import AboutPage from './pages/AboutPage';
import HelpPage from './pages/HelpPage';
import FaqPage from './pages/FaqPage';
import PostProjectPage from './pages/PostProjectPage';
import RulesPage from './pages/RulesPage';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import ContactPage from './pages/ContactPage';

const PlanPage = lazy(() => import('./pages/PlanPage'));
const AuthPage = lazy(() => import('./pages/AuthPage'));
const ContractorsPage = lazy(() => import('./pages/ContractorsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const WalletPage = lazy(() => import('./pages/WalletPage'));
const HomeownerProfilePage = lazy(() => import('./pages/HomeownerProfilePage'));
const ContractorProfilePage = lazy(() => import('./pages/ContractorProfilePage'));
const HomeownerDashboardPage = lazy(() => import('./pages/HomeownerDashboardPage'));
const ContractorDashboardPage = lazy(() => import('./pages/ContractorDashboardPage'));
const BrowseProjectsPage = lazy(() => import('./pages/BrowseProjectsPage'));
const ProjectPage = lazy(() => import('./pages/ProjectPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));

export type Route =
  'home'
  | 'plan'
  | 'how'
  | 'pricing'
  | 'about'
  | 'help'
  | 'faq'
  | 'auth'
  | 'contractors'
  | 'settings'
  | 'wallet'
  | 'homeowner'
  | 'contractor'
  | 'post'
  | 'hdash'
  | 'cdash'
  | 'browse'
  | 'project'
  | 'admin'
  | 'rules'
  | 'terms'
  | 'privacy'
  | 'contact';

type Page = ComponentType<{ vm: VM }> | LazyExoticComponent<ComponentType<{ vm: VM }>>;

export const PAGES: Record<Route, Page> = {
  home: HomePage,
  plan: PlanPage,
  how: HowPage,
  pricing: PricingPage,
  about: AboutPage,
  help: HelpPage,
  faq: FaqPage,
  auth: AuthPage,
  contractors: ContractorsPage,
  settings: SettingsPage,
  wallet: WalletPage,
  homeowner: HomeownerProfilePage,
  contractor: ContractorProfilePage,
  post: PostProjectPage,
  hdash: HomeownerDashboardPage,
  cdash: ContractorDashboardPage,
  browse: BrowseProjectsPage,
  project: ProjectPage,
  admin: AdminPage,
  rules: RulesPage,
  terms: TermsPage,
  privacy: PrivacyPage,
  contact: ContactPage,
};
