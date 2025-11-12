import type { SvgIconComponent } from '@mui/icons-material';
import {
  AttachMoney,
  BreakfastDining,
  Build,
  Business,
  CardGiftcard,
  CarRepair,
  Category,
  ChildCare,
  Coffee,
  CreditCard,
  DirectionsCar,
  ElectricBolt,
  Fastfood,
  Flight,
  Home,
  Hotel,
  LocalGasStation,
  LocalGroceryStore,
  LocalPharmacy,
  Movie,
  Phone,
  Restaurant,
  School,
  ShoppingBag,
  ShoppingCart,
  SportsEsports,
  TrendingDown,
  TrendingUp,
  WaterDrop,
  Wifi,
} from '@mui/icons-material';
import type { CategoryTreeResponse } from '@server/dto/category.dto';
import type { CategoryType } from '@server/generated/prisma/enums';

const getCategoryLabel = (
  categoryName: string,
  t: (key: string) => string,
): string => {
  const translationKey = `categories.${categoryName}`;
  const translated = t(translationKey);
  return translated !== translationKey ? translated : categoryName;
};

const CATEGORY_ICON_MAP: Record<string, SvgIconComponent> = {
  food_dining: Restaurant,
  breakfast: BreakfastDining,
  restaurant: Restaurant,
  dinner: Fastfood,
  lunch: Fastfood,
  coffee: Coffee,
  grocery_shopping: LocalGroceryStore,
  children: ChildCare,
  toys: SportsEsports,
  tuition: School,
  books_supplies: School,
  milk: LocalGroceryStore,
  pocket_money: AttachMoney,
  investment: TrendingUp,
  loss: TrendingDown,
  transportation: DirectionsCar,
  car_insurance: CreditCard,
  parking: DirectionsCar,
  car_wash: CarRepair,
  car_maintenance: CarRepair,
  taxi_rental: DirectionsCar,
  gasoline: LocalGasStation,
  utilities: ElectricBolt,
  electricity: ElectricBolt,
  landline: Phone,
  mobile_phone: Phone,
  natural_gas: WaterDrop,
  internet: Wifi,
  water: WaterDrop,
  housekeeping: Home,
  tv_cable: Movie,
  celebrations: CardGiftcard,
  gifts: CardGiftcard,
  wedding: CardGiftcard,
  funeral: Category,
  visiting: Home,
  entertainment: Movie,
  travel: Flight,
  beauty: Category,
  cosmetics: Category,
  drinks: LocalGroceryStore,
  movies_music: Movie,
  recreation: SportsEsports,
  shopping: ShoppingCart,
  electronics: Category,
  shoes: ShoppingBag,
  other_accessories: ShoppingBag,
  clothing: ShoppingBag,
  banking: Business,
  transfer_fee: CreditCard,
  housing: Home,
  send_home: Home,
  furniture_shopping: ShoppingCart,
  home_repair: Build,
  rent: Hotel,
  self_development: School,
  socializing: Category,
  education: School,
  health: LocalPharmacy,
  haircut: Category,
  medical: LocalPharmacy,
  sports: SportsEsports,
  medicine: LocalPharmacy,
  cash_out: AttachMoney,
  borrow: TrendingDown,
  lend: TrendingUp,
  repay_debt: AttachMoney,
  collect_debt: AttachMoney,
  transfer: TrendingUp,
  income: TrendingUp,
  expense: TrendingDown,
  salary: AttachMoney,
  bonus: CardGiftcard,
  gifts_received: CardGiftcard,
  investment_income: TrendingUp,
  business: Business,
  other: Category,
  buy: ShoppingCart,
  sell: ShoppingCart,
  dividend: TrendingUp,
  fee: CreditCard,
  gain: TrendingUp,
};

const DEFAULT_ICON = Category;

export const getCategoryIcon = (categoryName: string): SvgIconComponent => {
  return CATEGORY_ICON_MAP[categoryName] || DEFAULT_ICON;
};

export const flattenCategories = (
  categories: CategoryTreeResponse[],
  t: (key: string) => string,
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
