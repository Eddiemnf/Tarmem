/* Generated from ../../project/Tarmem.dc.html by tools/convert-template.py.
   Edit the design file and re-run the converter, or edit here and keep both in
   step — the markup is a mechanical port of the prototype's template. */

import type { ComponentType } from 'react';
import type { VM } from './state/viewModel';
import HomePage from './pages/HomePage';
import PlanPage from './pages/PlanPage';
import HowPage from './pages/HowPage';
import PricingPage from './pages/PricingPage';
import AboutPage from './pages/AboutPage';
import HelpPage from './pages/HelpPage';
import FaqPage from './pages/FaqPage';
import AuthPage from './pages/AuthPage';
import ContractorsPage from './pages/ContractorsPage';
import SettingsPage from './pages/SettingsPage';
import WalletPage from './pages/WalletPage';
import HomeownerProfilePage from './pages/HomeownerProfilePage';
import ContractorProfilePage from './pages/ContractorProfilePage';
import PostProjectPage from './pages/PostProjectPage';
import HomeownerDashboardPage from './pages/HomeownerDashboardPage';
import ContractorDashboardPage from './pages/ContractorDashboardPage';
import BrowseProjectsPage from './pages/BrowseProjectsPage';
import ProjectPage from './pages/ProjectPage';
import AdminPage from './pages/AdminPage';
import RulesPage from './pages/RulesPage';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import ContactPage from './pages/ContactPage';

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

export const PAGES: Record<Route, ComponentType<{ vm: VM }>> = {
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
