import type { CategoryTreeResponse } from '@server/dto/category.dto';
import type { CategoryType } from '@server/generated/prisma/enums';
import {
  IconBabyCarriage,
  IconBed,
  IconBolt,
  IconBuilding,
  IconBurger,
  IconCar,
  IconCategory,
  IconChefHat,
  IconCoffee,
  IconCreditCard,
  IconCurrencyDollar,
  IconDeviceGamepad,
  IconDroplet,
  IconGasStation,
  IconGift,
  IconHome,
  IconMovie,
  IconPhone,
  IconPill,
  IconPlane,
  IconSchool,
  IconShoppingBag,
  IconShoppingCart,
  IconTool,
  IconTools,
  IconTrendingDown,
  IconTrendingUp,
  IconWifi,
  type TablerIcon,
} from '@tabler/icons-react';
import type { TFunction } from 'i18next';

const getCategoryLabel = (
  categoryName: string,
  t: TFunction<'translation', undefined>,
): string => {
  const translationKey = `categories.${categoryName}`;
  const translated = t(translationKey as any);
  return translated !== translationKey ? translated : categoryName;
};

const CATEGORY_ICON_MAP: Record<string, TablerIcon> = {
  food_dining: IconChefHat,
  breakfast: IconCoffee,
  restaurant: IconChefHat,
  dinner: IconBurger,
  lunch: IconBurger,
  coffee: IconCoffee,
  grocery_shopping: IconShoppingCart,
  children: IconBabyCarriage,
  toys: IconDeviceGamepad,
  tuition: IconSchool,
  books_supplies: IconSchool,
  milk: IconShoppingCart,
  pocket_money: IconCurrencyDollar,
  investment: IconTrendingUp,
  loss: IconTrendingDown,
  transportation: IconCar,
  car_insurance: IconCreditCard,
  parking: IconCar,
  car_wash: IconTool,
  car_maintenance: IconTool,
  taxi_rental: IconCar,
  gasoline: IconGasStation,
  utilities: IconBolt,
  electricity: IconBolt,
  landline: IconPhone,
  mobile_phone: IconPhone,
  natural_gas: IconDroplet,
  internet: IconWifi,
  water: IconDroplet,
  housekeeping: IconHome,
  tv_cable: IconMovie,
  celebrations: IconGift,
  gifts: IconGift,
  wedding: IconGift,
  funeral: IconCategory,
  visiting: IconHome,
  entertainment: IconMovie,
  travel: IconPlane,
  beauty: IconCategory,
  cosmetics: IconCategory,
  drinks: IconShoppingCart,
  movies_music: IconMovie,
  recreation: IconDeviceGamepad,
  shopping: IconShoppingCart,
  electronics: IconCategory,
  shoes: IconShoppingBag,
  other_accessories: IconShoppingBag,
  clothing: IconShoppingBag,
  banking: IconBuilding,
  transfer_fee: IconCreditCard,
  housing: IconHome,
  send_home: IconHome,
  furniture_shopping: IconShoppingCart,
  home_repair: IconTools,
  rent: IconBed,
  self_development: IconSchool,
  socializing: IconCategory,
  education: IconSchool,
  health: IconPill,
  haircut: IconCategory,
  medical: IconPill,
  sports: IconDeviceGamepad,
  medicine: IconPill,
  cash_out: IconCurrencyDollar,
  borrow: IconTrendingDown,
  lend: IconTrendingUp,
  repay_debt: IconCurrencyDollar,
  collect_debt: IconCurrencyDollar,
  transfer: IconTrendingUp,
  income: IconTrendingUp,
  expense: IconTrendingDown,
  salary: IconCurrencyDollar,
  bonus: IconGift,
  gifts_received: IconGift,
  investment_income: IconTrendingUp,
  business: IconBuilding,
  other: IconCategory,
  buy: IconShoppingCart,
  sell: IconShoppingCart,
  dividend: IconTrendingUp,
  fee: IconCreditCard,
  gain: IconTrendingUp,
};

const DEFAULT_ICON = IconCategory;

export const getCategoryIcon = (categoryName: string): TablerIcon => {
  return CATEGORY_ICON_MAP[categoryName] || DEFAULT_ICON;
};

export const flattenCategories = (
  categories: CategoryTreeResponse[],
  t: TFunction<'translation', undefined>,
  filterType?: CategoryType,
  excludeId?: string,
  depth = 0,
): Array<{
  value: string;
  label: string;
  icon?: string | null;
  color?: string | null;
  disabled?: boolean;
}> => {
  const result: Array<{
    value: string;
    label: string;
    icon?: string | null;
    color?: string | null;
    disabled?: boolean;
  }> = [];

  for (const category of categories) {
    if (category.id === excludeId) {
      continue;
    }

    if (filterType && category.type !== filterType) {
      if (category.children && category.children.length > 0) {
        result.push(
          ...flattenCategories(
            category.children as CategoryTreeResponse[],
            t,
            filterType,
            excludeId,
            depth + 1,
          ),
        );
      }
      continue;
    }

    const prefix = '  '.repeat(depth);
    result.push({
      value: category.id,
      label: `${prefix}${getCategoryLabel(category.name, t)}`,
      icon: category.icon,
      color: category.color,
      disabled: category.isLocked,
    });

    if (category.children && category.children.length > 0) {
      result.push(
        ...flattenCategories(
          category.children as CategoryTreeResponse[],
          t,
          filterType,
          excludeId,
          depth + 1,
        ),
      );
    }
  }

  return result;
};

export { getCategoryLabel };
