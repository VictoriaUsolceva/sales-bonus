/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
  return +(
    purchase.sale_price *
    purchase.quantity *
    (1 - purchase.discount / 100)
  ).toFixed(2);
}

/**
 * Простой расчёт прибыли
 * @param item
 * @param product
 * @returns {number}
 */
function calculateSimpleProfit(item, product) {
  return (
    item.sale_price * item.quantity * (1 - item.discount / 100) -
    product.purchase_price * item.quantity
  );
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
  if (index === 0) {
    return Math.floor((seller.profit * 15)) / 100;
  } else if ([1, 2].includes(index)) {
    return Math.floor((seller.profit * 10)) / 100;
  } else if (index !== (total - 1)) {
    return Math.floor((seller.profit * 5)) / 100;
  } else {
    return 0;
  }
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
  if (
    !data ||
    !Array.isArray(data.sellers) ||
    data.sellers.length === 0 ||
    data.purchase_records.length === 0
  ) {
    throw new Error("Некорректные входные данные");
  }

  const { calculateRevenue, calculateBonus } = options;

  if (
    !(typeof calculateRevenue === "function") ||
    !typeof calculateBonus === "function"
  ) {
    throw new Error("Чего-то не хватает");
  }

  const stats = data.purchase_records.reduce(
    (acc, record) => {
      const sellerId = record.seller_id;

      const seller = data.sellers.find((s) => s.id === record.seller_id);

      if (!acc.sellers[sellerId])
        acc.sellers[sellerId] = {
          seller_id: sellerId,
          name: `${seller.first_name} ${seller.last_name}`,
          revenue: 0,
          profit: 0,
          sales_count: 0,
          top_products: [],
        };

      record.items.forEach((item) => {
        const product = data.products.find((p) => p.sku === item.sku);
        const profit = calculateSimpleProfit(item, product);

        // Обновление статистики продавца
        acc.sellers[sellerId].profit += profit;

        const findedProduct = acc.sellers[sellerId].top_products.find(
          (product) => product.sku === item.sku
        );
        if (findedProduct) {
          findedProduct.quantity += item.quantity;
        } else {
          acc.sellers[sellerId].top_products.push({
            sku: item.sku,
            quantity: item.quantity,
          });
        }
      });

      acc.sellers[sellerId].sales_count += 1;

      acc.sellers[sellerId].revenue += +(record.total_amount - record.total_discount).toFixed(2);

      return acc;
    },
    { sellers: {} }
  );

  const sellers = Object.entries(stats.sellers).flatMap((i) => i[1]);

  sellers.map((seller) => {
    seller.top_products = seller.top_products
      .sort((a, b) => {
        return b.quantity - a.quantity;
      })
      .slice(0, 10);

    seller.revenue = +seller.revenue.toFixed(2);
    seller.profit = +seller.profit.toFixed(2);
  });

  const sortedSellers = Object.entries(stats.sellers)
    .sort((a, b) => {
      return b[1].profit - a[1].profit;
    })
    .flatMap((i) => i[1]);

  sortedSellers.forEach((element, index) => {
    element.bonus = calculateBonus(index, sortedSellers.length, element);
  });

  return sortedSellers;
}
