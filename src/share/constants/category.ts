import { CategoryType } from '@server/generated/prisma/enums';

export const CATEGORY_NAME = {
  // Expense categories - Parents
  FOOD_DINING: 'food_dining',
  CHILDREN: 'children',
  TRANSPORTATION: 'transportation',
  UTILITIES: 'utilities',
  CELEBRATIONS: 'celebrations',
  ENTERTAINMENT: 'entertainment',
  SHOPPING: 'shopping',
  BANKING: 'banking',
  HOUSING: 'housing',
  SELF_DEVELOPMENT: 'self_development',
  HEALTH: 'health',
  CASH_OUT: 'cash_out',

  // Expense categories - Children
  BREAKFAST: 'breakfast',
  RESTAURANT: 'restaurant',
  DINNER: 'dinner',
  LUNCH: 'lunch',
  COFFEE: 'coffee',
  GROCERY_SHOPPING: 'grocery_shopping',
  TOYS: 'toys',
  TUITION: 'tuition',
  BOOKS_SUPPLIES: 'books_supplies',
  MILK: 'milk',
  POCKET_MONEY: 'pocket_money',
  LOSS: 'loss',
  CAR_INSURANCE: 'car_insurance',
  PARKING: 'parking',
  CAR_WASH: 'car_wash',
  CAR_MAINTENANCE: 'car_maintenance',
  TAXI_RENTAL: 'taxi_rental',
  GASOLINE: 'gasoline',
  ELECTRICITY: 'electricity',
  NATURAL_GAS: 'natural_gas',
  INTERNET: 'internet',
  LANDLINE: 'landline',
  MOBILE_PHONE: 'mobile_phone',
  WATER: 'water',
  HOUSEKEEPING: 'housekeeping',
  TV_CABLE: 'tv_cable',
  GIFTS: 'gifts',
  WEDDING: 'wedding',
  FUNERAL: 'funeral',
  VISITING: 'visiting',
  TRAVEL: 'travel',
  BEAUTY: 'beauty',
  COSMETICS: 'cosmetics',
  DRINKS: 'drinks',
  MOVIES_MUSIC: 'movies_music',
  RECREATION: 'recreation',
  ELECTRONICS: 'electronics',
  SHOES: 'shoes',
  OTHER_ACCESSORIES: 'other_accessories',
  CLOTHING: 'clothing',
  TRANSFER_FEE: 'transfer_fee',
  SEND_HOME: 'send_home',
  FURNITURE_SHOPPING: 'furniture_shopping',
  HOME_REPAIR: 'home_repair',
  RENT: 'rent',
  SOCIALIZING: 'socializing',
  EDUCATION: 'education',
  HAIRCUT: 'haircut',
  MEDICAL: 'medical',
  SPORTS: 'sports',
  MEDICINE: 'medicine',

  // Loan categories
  BORROW: 'borrow',
  LEND: 'lend',
  REPAY_DEBT: 'repay_debt',
  COLLECT_DEBT: 'collect_debt',

  // Transfer
  TRANSFER: 'transfer',

  // Balance Adjustment
  BALANCE_ADJUSTMENT: 'balance_adjustment',

  // Income categories - Parents
  INCOME: 'income',
  EXPENSE: 'expense',

  // Income categories - Children
  SALARY: 'salary',
  BONUS: 'bonus',
  GIFTS_RECEIVED: 'gifts_received',
  INVESTMENT_INCOME: 'investment_income',
  BUSINESS: 'business',
  OTHER: 'other',

  // Investment categories - Parents
  INVESTMENT: 'investment',

  // Investment categories - Children
  BUY: 'buy',
  SELL: 'sell',
  DIVIDEND: 'dividend',
  FEE: 'fee',
  GAIN: 'gain',
} as const;

export type CategoryName = (typeof CATEGORY_NAME)[keyof typeof CATEGORY_NAME];

export interface CategorySeedData {
  name: CategoryName;
  type: CategoryType;
  children?: CategorySeedData[];
}

export const EXPENSE_CATEGORIES: CategorySeedData[] = [
  {
    name: CATEGORY_NAME.FOOD_DINING,
    type: CategoryType.expense,
    children: [
      { name: CATEGORY_NAME.BREAKFAST, type: CategoryType.expense },
      { name: CATEGORY_NAME.RESTAURANT, type: CategoryType.expense },
      { name: CATEGORY_NAME.DINNER, type: CategoryType.expense },
      { name: CATEGORY_NAME.LUNCH, type: CategoryType.expense },
      { name: CATEGORY_NAME.COFFEE, type: CategoryType.expense },
      { name: CATEGORY_NAME.GROCERY_SHOPPING, type: CategoryType.expense },
    ],
  },
  {
    name: CATEGORY_NAME.CHILDREN,
    type: CategoryType.expense,
    children: [
      { name: CATEGORY_NAME.TOYS, type: CategoryType.expense },
      { name: CATEGORY_NAME.TUITION, type: CategoryType.expense },
      { name: CATEGORY_NAME.BOOKS_SUPPLIES, type: CategoryType.expense },
      { name: CATEGORY_NAME.MILK, type: CategoryType.expense },
      { name: CATEGORY_NAME.POCKET_MONEY, type: CategoryType.expense },
    ],
  },
  {
    name: CATEGORY_NAME.TRANSPORTATION,
    type: CategoryType.expense,
    children: [
      { name: CATEGORY_NAME.CAR_INSURANCE, type: CategoryType.expense },
      { name: CATEGORY_NAME.PARKING, type: CategoryType.expense },
      { name: CATEGORY_NAME.CAR_WASH, type: CategoryType.expense },
      { name: CATEGORY_NAME.CAR_MAINTENANCE, type: CategoryType.expense },
      { name: CATEGORY_NAME.TAXI_RENTAL, type: CategoryType.expense },
      { name: CATEGORY_NAME.GASOLINE, type: CategoryType.expense },
    ],
  },
  {
    name: CATEGORY_NAME.UTILITIES,
    type: CategoryType.expense,
    children: [
      { name: CATEGORY_NAME.ELECTRICITY, type: CategoryType.expense },
      { name: CATEGORY_NAME.LANDLINE, type: CategoryType.expense },
      { name: CATEGORY_NAME.MOBILE_PHONE, type: CategoryType.expense },
      { name: CATEGORY_NAME.NATURAL_GAS, type: CategoryType.expense },
      { name: CATEGORY_NAME.INTERNET, type: CategoryType.expense },
      { name: CATEGORY_NAME.WATER, type: CategoryType.expense },
      { name: CATEGORY_NAME.HOUSEKEEPING, type: CategoryType.expense },
      { name: CATEGORY_NAME.TV_CABLE, type: CategoryType.expense },
    ],
  },
  {
    name: CATEGORY_NAME.CELEBRATIONS,
    type: CategoryType.expense,
    children: [
      { name: CATEGORY_NAME.GIFTS, type: CategoryType.expense },
      { name: CATEGORY_NAME.WEDDING, type: CategoryType.expense },
      { name: CATEGORY_NAME.FUNERAL, type: CategoryType.expense },
      { name: CATEGORY_NAME.VISITING, type: CategoryType.expense },
    ],
  },
  {
    name: CATEGORY_NAME.ENTERTAINMENT,
    type: CategoryType.expense,
    children: [
      { name: CATEGORY_NAME.TRAVEL, type: CategoryType.expense },
      { name: CATEGORY_NAME.BEAUTY, type: CategoryType.expense },
      { name: CATEGORY_NAME.COSMETICS, type: CategoryType.expense },
      { name: CATEGORY_NAME.DRINKS, type: CategoryType.expense },
      { name: CATEGORY_NAME.MOVIES_MUSIC, type: CategoryType.expense },
      { name: CATEGORY_NAME.RECREATION, type: CategoryType.expense },
    ],
  },
  {
    name: CATEGORY_NAME.SHOPPING,
    type: CategoryType.expense,
    children: [
      { name: CATEGORY_NAME.ELECTRONICS, type: CategoryType.expense },
      { name: CATEGORY_NAME.SHOES, type: CategoryType.expense },
      { name: CATEGORY_NAME.OTHER_ACCESSORIES, type: CategoryType.expense },
      { name: CATEGORY_NAME.CLOTHING, type: CategoryType.expense },
    ],
  },
  {
    name: CATEGORY_NAME.BANKING,
    type: CategoryType.expense,
    children: [
      { name: CATEGORY_NAME.TRANSFER_FEE, type: CategoryType.expense },
    ],
  },
  {
    name: CATEGORY_NAME.HOUSING,
    type: CategoryType.expense,
    children: [
      { name: CATEGORY_NAME.SEND_HOME, type: CategoryType.expense },
      { name: CATEGORY_NAME.FURNITURE_SHOPPING, type: CategoryType.expense },
      { name: CATEGORY_NAME.HOME_REPAIR, type: CategoryType.expense },
      { name: CATEGORY_NAME.RENT, type: CategoryType.expense },
    ],
  },
  {
    name: CATEGORY_NAME.SELF_DEVELOPMENT,
    type: CategoryType.expense,
    children: [
      { name: CATEGORY_NAME.SOCIALIZING, type: CategoryType.expense },
      { name: CATEGORY_NAME.EDUCATION, type: CategoryType.expense },
    ],
  },
  {
    name: CATEGORY_NAME.HEALTH,
    type: CategoryType.expense,
    children: [
      { name: CATEGORY_NAME.HAIRCUT, type: CategoryType.expense },
      { name: CATEGORY_NAME.MEDICAL, type: CategoryType.expense },
      { name: CATEGORY_NAME.SPORTS, type: CategoryType.expense },
      { name: CATEGORY_NAME.MEDICINE, type: CategoryType.expense },
    ],
  },
  {
    name: CATEGORY_NAME.CASH_OUT,
    type: CategoryType.expense,
  },
];

export const LOAN_CATEGORIES: CategorySeedData[] = [
  { name: CATEGORY_NAME.BORROW, type: CategoryType.loan },
  { name: CATEGORY_NAME.LEND, type: CategoryType.loan },
  { name: CATEGORY_NAME.REPAY_DEBT, type: CategoryType.loan },
  { name: CATEGORY_NAME.COLLECT_DEBT, type: CategoryType.loan },
];

export const TRANSFER_CATEGORY: CategorySeedData = {
  name: CATEGORY_NAME.TRANSFER,
  type: CategoryType.transfer,
};

export const INVESTMENT_CATEGORY: CategorySeedData = {
  name: CATEGORY_NAME.INVESTMENT,
  type: CategoryType.investment,
  children: [
    { name: CATEGORY_NAME.BUY, type: CategoryType.investment },
    { name: CATEGORY_NAME.SELL, type: CategoryType.investment },
    { name: CATEGORY_NAME.DIVIDEND, type: CategoryType.investment },
    { name: CATEGORY_NAME.FEE, type: CategoryType.investment },
    { name: CATEGORY_NAME.GAIN, type: CategoryType.investment },
    { name: CATEGORY_NAME.LOSS, type: CategoryType.investment },
  ],
};

export const INCOME_CATEGORIES: CategorySeedData = {
  name: CATEGORY_NAME.INCOME,
  type: CategoryType.income,
  children: [
    { name: CATEGORY_NAME.SALARY, type: CategoryType.income },
    { name: CATEGORY_NAME.BONUS, type: CategoryType.income },
    { name: CATEGORY_NAME.GIFTS_RECEIVED, type: CategoryType.income },
    { name: CATEGORY_NAME.INVESTMENT_INCOME, type: CategoryType.income },
    { name: CATEGORY_NAME.BUSINESS, type: CategoryType.income },
    { name: CATEGORY_NAME.OTHER, type: CategoryType.income },
  ],
};

export const BALANCE_ADJUSTMENT_CATEGORIES: CategorySeedData[] = [
  { name: CATEGORY_NAME.BALANCE_ADJUSTMENT, type: CategoryType.income },
  { name: CATEGORY_NAME.BALANCE_ADJUSTMENT, type: CategoryType.expense },
];
