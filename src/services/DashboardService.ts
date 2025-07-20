import { Order } from '../models/OrderModel';
import { Reservation } from '../models/ReservationModel';
import { ReservationDetail } from '../models/ReservationDetailModel';
import { Address } from '../models/AddressModel';
import User from '../models/UserModel';
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subDays,
  subWeeks,
  subMonths,
  eachHourOfInterval,
  eachDayOfInterval,
  format,
  addHours,
} from 'date-fns';
import { vi } from 'date-fns/locale';

class DashboardService {
  private readonly VIETNAM_TIMEZONE_OFFSET = 7; // UTC+7

  private toVietnamTime(date: Date): Date {
    return addHours(date, this.VIETNAM_TIMEZONE_OFFSET);
  }

  private fromVietnamTime(date: Date): Date {
    return addHours(date, -this.VIETNAM_TIMEZONE_OFFSET);
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(amount);
  }

  private calculatePercentChange(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Number((((current - previous) / previous) * 100).toFixed(1));
  }

  private getTrend(percentChange: number): 'up' | 'down' | 'neutral' {
    if (percentChange > 0) return 'up';
    if (percentChange < 0) return 'down';
    return 'neutral';
  }

  async getDailyMetrics() {
    const today = this.toVietnamTime(new Date());
    const yesterday = subDays(today, 1);

    // Time ranges for today in Vietnam timezone
    const todayStart = this.fromVietnamTime(startOfDay(today));
    const todayEnd = this.fromVietnamTime(endOfDay(today));

    // Time ranges for yesterday in Vietnam timezone
    const yesterdayStart = this.fromVietnamTime(startOfDay(yesterday));
    const yesterdayEnd = this.fromVietnamTime(endOfDay(yesterday));

    // Get hourly intervals for the chart in Vietnam time
    const hours = eachHourOfInterval({ start: todayStart, end: todayEnd });
    const labels = hours.map((hour) => format(this.toVietnamTime(hour), 'HH:00', { locale: vi }));

    // Get metrics for today
    const [todayOrders, todayReservations, todayUsers] = await Promise.all([
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: todayStart, $lte: todayEnd },
            status: { $ne: 'CANCELLED' },
            payment_status: 'PAID',
          },
        },
        {
          $addFields: {
            vietnamHour: { $add: [{ $hour: '$createdAt' }, this.VIETNAM_TIMEZONE_OFFSET] },
          },
        },
        {
          $addFields: {
            adjustedHour: { $mod: ['$vietnamHour', 24] },
          },
        },
        {
          $group: { _id: '$adjustedHour', total: { $sum: '$total_price' } },
        },
        {
          $sort: { _id: 1 },
        },
      ]),
      Reservation.aggregate([
        {
          $match: {
            createdAt: { $gte: todayStart, $lte: todayEnd },
            status: { $ne: 'CANCELLED' },
            payment_status: 'PAID',
          },
        },
        {
          $lookup: {
            from: 'reservationdetails',
            localField: '_id',
            foreignField: 'reservation_id',
            as: 'details',
          },
        },
        { $unwind: '$details' },
        {
          $addFields: {
            vietnamHour: { $add: [{ $hour: '$createdAt' }, this.VIETNAM_TIMEZONE_OFFSET] },
          },
        },
        {
          $addFields: {
            adjustedHour: { $mod: ['$vietnamHour', 24] },
          },
        },
        {
          $group: {
            _id: '$adjustedHour',
            total: { $sum: { $multiply: ['$details.unit_price', '$details.quantity'] } },
          },
        },
        {
          $sort: { _id: 1 },
        },
      ]),
      User.aggregate<{ _id: number; count: number }>([
        {
          $match: { createdAt: { $gte: todayStart, $lte: todayEnd } },
        },
        {
          $addFields: {
            vietnamHour: { $add: [{ $hour: '$createdAt' }, this.VIETNAM_TIMEZONE_OFFSET] },
          },
        },
        {
          $addFields: {
            adjustedHour: { $mod: ['$vietnamHour', 24] },
          },
        },
        {
          $group: {
            _id: '$adjustedHour',
            count: { $sum: 1 },
          },
        },
        {
          $sort: { _id: 1 },
        },
      ]),
    ]);

    // Get yesterday's totals for comparison
    const [yesterdayOrderTotal, yesterdayReservationTotal, yesterdayUserCount] = await Promise.all([
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: yesterdayStart, $lte: yesterdayEnd },
            status: { $ne: 'CANCELLED' },
            payment_status: 'PAID',
          },
        },
        { $group: { _id: null, total: { $sum: '$total_price' } } },
      ]),
      Reservation.aggregate([
        {
          $match: {
            createdAt: { $gte: yesterdayStart, $lte: yesterdayEnd },
            status: { $ne: 'CANCELLED' },
            payment_status: 'PAID',
          },
        },
        {
          $lookup: {
            from: 'reservationdetails',
            localField: '_id',
            foreignField: 'reservation_id',
            as: 'details',
          },
        },
        { $unwind: '$details' },
        {
          $group: {
            _id: null,
            total: { $sum: { $multiply: ['$details.unit_price', '$details.quantity'] } },
          },
        },
      ]),
      User.countDocuments({ createdAt: { $gte: yesterdayStart, $lte: yesterdayEnd } }),
    ]);

    // Prepare hourly data
    const orderValues = new Array(24).fill(0);
    const reservationValues = new Array(24).fill(0);
    const userValues = new Array(24).fill(0);

    todayOrders.forEach((item) => (orderValues[item._id] = item.total || 0));
    todayReservations.forEach((item) => (reservationValues[item._id] = item.total || 0));
    (todayUsers as { _id: number; count: number }[]).forEach(
      (item) => (userValues[item._id] = item.count || 0),
    );

    // Calculate totals
    const todayOrderTotal = orderValues.reduce((a, b) => a + b, 0);
    const todayReservationTotal = reservationValues.reduce((a, b) => a + b, 0);
    const todayUserTotal = userValues.reduce((a, b) => a + b, 0);

    return [
      {
        title: 'Tổng doanh thu đơn hàng',
        value: todayOrderTotal.toString(),
        displayValue: this.formatCurrency(todayOrderTotal),
        interval: 'Hôm nay',
        trend: this.getTrend(
          this.calculatePercentChange(todayOrderTotal, yesterdayOrderTotal[0]?.total || 0),
        ),
        percent: this.calculatePercentChange(todayOrderTotal, yesterdayOrderTotal[0]?.total || 0),
        chartData: {
          labels,
          values: orderValues,
        },
      },
      {
        title: 'Tổng doanh thu đặt bàn',
        value: todayReservationTotal.toString(),
        displayValue: this.formatCurrency(todayReservationTotal),
        interval: 'Hôm nay',
        trend: this.getTrend(
          this.calculatePercentChange(
            todayReservationTotal,
            yesterdayReservationTotal[0]?.total || 0,
          ),
        ),
        percent: this.calculatePercentChange(
          todayReservationTotal,
          yesterdayReservationTotal[0]?.total || 0,
        ),
        chartData: {
          labels,
          values: reservationValues,
        },
      },
      {
        title: 'Tổng người dùng đăng ký',
        value: todayUserTotal.toString(),
        displayValue: todayUserTotal.toString(),
        interval: 'Hôm nay',
        trend: this.getTrend(this.calculatePercentChange(todayUserTotal, yesterdayUserCount)),
        percent: this.calculatePercentChange(todayUserTotal, yesterdayUserCount),
        chartData: {
          labels,
          values: userValues,
        },
      },
    ];
  }

  async getWeeklyMetrics() {
    const today = this.toVietnamTime(new Date());

    // Current week in Vietnam timezone
    const weekStart = this.fromVietnamTime(startOfWeek(today, { weekStartsOn: 1 }));
    const weekEnd = this.fromVietnamTime(endOfWeek(today, { weekStartsOn: 1 }));

    // Previous week in Vietnam timezone
    const prevWeekStart = this.fromVietnamTime(
      startOfWeek(subWeeks(today, 1), { weekStartsOn: 1 }),
    );
    const prevWeekEnd = this.fromVietnamTime(endOfWeek(subWeeks(today, 1), { weekStartsOn: 1 }));

    // Get daily intervals for the chart
    const days = eachDayOfInterval({
      start: this.toVietnamTime(weekStart),
      end: this.toVietnamTime(weekEnd),
    });
    const labels = days.map((day) => format(day, 'EEEEEE', { locale: vi }));

    // Get metrics for this week
    const [weekOrders, weekReservations, weekUsers] = await Promise.all([
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: weekStart, $lte: weekEnd },
            status: { $ne: 'CANCELLED' },
            payment_status: 'PAID',
          },
        },
        {
          $addFields: {
            vietnamDate: {
              $add: ['$createdAt', { $multiply: [this.VIETNAM_TIMEZONE_OFFSET, 60 * 60 * 1000] }],
            },
          },
        },
        {
          $group: {
            _id: { $dayOfWeek: '$vietnamDate' },
            total: { $sum: '$total_price' },
          },
        },
        {
          $sort: { _id: 1 },
        },
      ]),
      Reservation.aggregate([
        {
          $match: {
            createdAt: { $gte: weekStart, $lte: weekEnd },
            status: { $ne: 'CANCELLED' },
            payment_status: 'PAID',
          },
        },
        {
          $lookup: {
            from: 'reservationdetails',
            localField: '_id',
            foreignField: 'reservation_id',
            as: 'details',
          },
        },
        { $unwind: '$details' },
        {
          $addFields: {
            vietnamDate: {
              $add: ['$createdAt', { $multiply: [this.VIETNAM_TIMEZONE_OFFSET, 60 * 60 * 1000] }],
            },
          },
        },
        {
          $group: {
            _id: { $dayOfWeek: '$vietnamDate' },
            total: { $sum: { $multiply: ['$details.unit_price', '$details.quantity'] } },
          },
        },
        {
          $sort: { _id: 1 },
        },
      ]),
      User.aggregate<{ _id: number; count: number }>([
        {
          $match: { createdAt: { $gte: weekStart, $lte: weekEnd } },
        },
        {
          $addFields: {
            vietnamDate: {
              $add: ['$createdAt', { $multiply: [this.VIETNAM_TIMEZONE_OFFSET, 60 * 60 * 1000] }],
            },
          },
        },
        {
          $group: {
            _id: { $dayOfWeek: '$vietnamDate' },
            count: { $sum: 1 },
          },
        },
        {
          $sort: { _id: 1 },
        },
      ]),
    ]);

    // Get metrics for last week
    const [prevWeekOrderTotal, prevWeekReservationTotal, prevWeekUserCount] = await Promise.all([
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: prevWeekStart, $lte: prevWeekEnd },
            status: { $ne: 'CANCELLED' },
            payment_status: 'PAID',
          },
        },
        { $group: { _id: null, total: { $sum: '$total_price' } } },
      ]),
      Reservation.aggregate([
        {
          $match: {
            createdAt: { $gte: prevWeekStart, $lte: prevWeekEnd },
            status: { $ne: 'CANCELLED' },
            payment_status: 'PAID',
          },
        },
        {
          $lookup: {
            from: 'reservationdetails',
            localField: '_id',
            foreignField: 'reservation_id',
            as: 'details',
          },
        },
        { $unwind: '$details' },
        {
          $group: {
            _id: null,
            total: { $sum: { $multiply: ['$details.unit_price', '$details.quantity'] } },
          },
        },
      ]),
      User.countDocuments({ createdAt: { $gte: prevWeekStart, $lte: prevWeekEnd } }),
    ]);

    // Prepare daily data (MongoDB's $dayOfWeek returns 1 for Sunday, 2 for Monday, etc.)
    const orderValues = new Array(7).fill(0);
    const reservationValues = new Array(7).fill(0);
    const userValues = new Array(7).fill(0);

    weekOrders.forEach((item) => (orderValues[(item._id - 2 + 7) % 7] = item.total || 0));
    weekReservations.forEach(
      (item) => (reservationValues[(item._id - 2 + 7) % 7] = item.total || 0),
    );
    (weekUsers as { _id: number; count: number }[]).forEach((item) => {
      const idx = (item._id - 2 + 7) % 7;
      userValues[idx] = item.count || 0;
    });

    // Calculate totals
    const weekOrderTotal = orderValues.reduce((a, b) => a + b, 0);
    const weekReservationTotal = reservationValues.reduce((a, b) => a + b, 0);
    const weekUserTotal = userValues.reduce((a, b) => a + b, 0);

    return [
      {
        title: 'Tổng doanh thu đơn hàng',
        value: weekOrderTotal.toString(),
        displayValue: this.formatCurrency(weekOrderTotal),
        interval: 'Tuần này',
        trend: this.getTrend(
          this.calculatePercentChange(weekOrderTotal, prevWeekOrderTotal[0]?.total || 0),
        ),
        percent: this.calculatePercentChange(weekOrderTotal, prevWeekOrderTotal[0]?.total || 0),
        chartData: {
          labels,
          values: orderValues,
        },
      },
      {
        title: 'Tổng doanh thu đặt bàn',
        value: weekReservationTotal.toString(),
        displayValue: this.formatCurrency(weekReservationTotal),
        interval: 'Tuần này',
        trend: this.getTrend(
          this.calculatePercentChange(
            weekReservationTotal,
            prevWeekReservationTotal[0]?.total || 0,
          ),
        ),
        percent: this.calculatePercentChange(
          weekReservationTotal,
          prevWeekReservationTotal[0]?.total || 0,
        ),
        chartData: {
          labels,
          values: reservationValues,
        },
      },
      {
        title: 'Tổng người dùng đăng ký',
        value: weekUserTotal.toString(),
        displayValue: weekUserTotal.toString(),
        interval: 'Tuần này',
        trend: this.getTrend(this.calculatePercentChange(weekUserTotal, prevWeekUserCount)),
        percent: this.calculatePercentChange(weekUserTotal, prevWeekUserCount),
        chartData: {
          labels,
          values: userValues,
        },
      },
    ];
  }

  async getMonthlyMetrics() {
    const today = new Date();

    // Current month
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);

    // Previous month
    const prevMonthStart = startOfMonth(subMonths(today, 1));
    const prevMonthEnd = endOfMonth(subMonths(today, 1));

    // Get daily intervals for the chart
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const labels = days.map((day) => format(day, 'd'));

    // Get metrics for this month
    const [monthOrders, monthReservations, monthUsers] = await Promise.all([
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: monthStart, $lte: monthEnd },
            status: { $ne: 'CANCELLED' },
            payment_status: 'PAID',
          },
        },
        { $group: { _id: { $dayOfMonth: '$createdAt' }, total: { $sum: '$total_price' } } },
      ]),
      Reservation.aggregate([
        {
          $match: { createdAt: { $gte: monthStart, $lte: monthEnd }, status: { $ne: 'CANCELLED' } },
        },
        {
          $lookup: {
            from: 'reservationdetails',
            localField: '_id',
            foreignField: 'reservation_id',
            as: 'details',
          },
        },
        { $unwind: '$details' },
        {
          $group: {
            _id: { $dayOfMonth: '$createdAt' },
            total: { $sum: { $multiply: ['$details.unit_price', '$details.quantity'] } },
          },
        },
      ]),
      User.aggregate<{ _id: number; count: number }>([
        {
          $match: { createdAt: { $gte: monthStart, $lte: monthEnd } },
        },
        {
          $group: {
            _id: { $dayOfMonth: '$createdAt' },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    // Get metrics for last month
    const [prevMonthOrderTotal, prevMonthReservationTotal, prevMonthUserCount] = await Promise.all([
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: prevMonthStart, $lte: prevMonthEnd },
            status: { $ne: 'CANCELLED' },
          },
        },
        { $group: { _id: null, total: { $sum: '$total_price' } } },
      ]),
      Reservation.aggregate([
        {
          $match: {
            createdAt: { $gte: prevMonthStart, $lte: prevMonthEnd },
            status: { $ne: 'CANCELLED' },
          },
        },
        {
          $lookup: {
            from: 'reservationdetails',
            localField: '_id',
            foreignField: 'reservation_id',
            as: 'details',
          },
        },
        { $unwind: '$details' },
        {
          $group: {
            _id: null,
            total: { $sum: { $multiply: ['$details.unit_price', '$details.quantity'] } },
          },
        },
      ]),
      User.countDocuments({ createdAt: { $gte: prevMonthStart, $lte: prevMonthEnd } }),
    ]);

    // Prepare daily data
    const daysInMonth = days.length;
    const orderValues = new Array(daysInMonth).fill(0);
    const reservationValues = new Array(daysInMonth).fill(0);
    const userValues = new Array(daysInMonth).fill(0);

    monthOrders.forEach((item) => (orderValues[item._id - 1] = item.total || 0));
    monthReservations.forEach((item) => (reservationValues[item._id - 1] = item.total || 0));
    (monthUsers as { _id: number; count: number }[]).forEach(
      (item) => (userValues[(typeof item._id === 'number' ? item._id : 1) - 1] = item.count || 0),
    );

    // Calculate totals
    const monthOrderTotal = orderValues.reduce((a, b) => a + b, 0);
    const monthReservationTotal = reservationValues.reduce((a, b) => a + b, 0);
    const monthUserTotal = userValues.reduce((a, b) => a + b, 0);

    return [
      {
        title: 'Tổng doanh thu đơn hàng',
        value: monthOrderTotal.toString(),
        displayValue: this.formatCurrency(monthOrderTotal),
        interval: 'Tháng này',
        trend: this.getTrend(
          this.calculatePercentChange(monthOrderTotal, prevMonthOrderTotal[0]?.total || 0),
        ),
        percent: this.calculatePercentChange(monthOrderTotal, prevMonthOrderTotal[0]?.total || 0),
        chartData: {
          labels,
          values: orderValues,
        },
      },
      {
        title: 'Tổng doanh thu đặt bàn',
        value: monthReservationTotal.toString(),
        displayValue: this.formatCurrency(monthReservationTotal),
        interval: 'Tháng này',
        trend: this.getTrend(
          this.calculatePercentChange(
            monthReservationTotal,
            prevMonthReservationTotal[0]?.total || 0,
          ),
        ),
        percent: this.calculatePercentChange(
          monthReservationTotal,
          prevMonthReservationTotal[0]?.total || 0,
        ),
        chartData: {
          labels,
          values: reservationValues,
        },
      },
      {
        title: 'Tổng người dùng đăng ký',
        value: monthUserTotal.toString(),
        displayValue: monthUserTotal.toString(),
        interval: 'Tháng này',
        trend: this.getTrend(this.calculatePercentChange(monthUserTotal, prevMonthUserCount)),
        percent: this.calculatePercentChange(monthUserTotal, prevMonthUserCount),
        chartData: {
          labels,
          values: userValues,
        },
      },
    ];
  }

  async getMetrics(timeRange: 'daily' | 'weekly' | 'monthly' = 'daily') {
    switch (timeRange) {
      case 'weekly':
        return this.getWeeklyMetrics();
      case 'monthly':
        return this.getMonthlyMetrics();
      default:
        return this.getDailyMetrics();
    }
  }

  async getRevenueChart(year: number) {
    const currentYear = new Date().getFullYear();
    const selectedYear = year || currentYear;

    const startDate = new Date(`${selectedYear}-01-01`);
    const endDate = new Date(`${selectedYear}-12-31T23:59:59.999Z`);

    const orderData = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          status: { $ne: 'CANCELLED' },
        },
      },
      {
        $group: {
          _id: { $month: '$createdAt' },
          orderRevenue: { $sum: '$total_price' },
          orderCount: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const reservationData = await Reservation.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          status: { $ne: 'CANCELLED' },
        },
      },
      {
        $group: {
          _id: { $month: '$createdAt' },
          reservationRevenue: { $sum: '$total_price' },
          reservationCount: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const monthNames = [
      'Th1',
      'Th2',
      'Th3',
      'Th4',
      'Th5',
      'Th6',
      'Th7',
      'Th8',
      'Th9',
      'Th10',
      'Th11',
      'Th12',
    ];

    const result = monthNames.map((month, index) => {
      const monthNumber = index + 1;

      const orderMonth = orderData.find((item) => item._id === monthNumber);
      const reservationMonth = reservationData.find((item) => item._id === monthNumber);

      return {
        month,
        orderRevenue: orderMonth?.orderRevenue || 0,
        orderCount: orderMonth?.orderCount || 0,
        reservationRevenue: reservationMonth?.reservationRevenue || 0,
        reservationCount: reservationMonth?.reservationCount || 0,
      };
    });

    return result;
  }

  async getRecentTransactions() {
    try {
      // 1. Lấy đơn hàng mới nhất
      const rawOrders = await Order.find()
        .select('receiver receiver_phone createdAt total_price address_id status')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();

      const addressIds = rawOrders
        .filter((o) => (!o.receiver || !o.receiver_phone) && o.address_id)
        .map((o) => o.address_id);

      let addressMap = new Map<string, { full_name: string; phone: string }>();
      if (addressIds.length > 0) {
        const addresses = await Address.find({ _id: { $in: addressIds } })
          .select('full_name phone')
          .lean();
        addressMap = new Map(
          addresses.map((a) => [a._id.toString(), { full_name: a.full_name, phone: a.phone }]),
        );
      }

      const recentOrders = rawOrders.map((item) => {
        const fallback = item.address_id ? addressMap.get(item.address_id.toString()) : undefined;
        const total = item.total_price ?? 0;
        return {
          id: item._id,
          customerName: item.receiver || fallback?.full_name || 'Chưa cập nhật',
          phone: item.receiver_phone || fallback?.phone || '',
          createdAt: item.createdAt,
          total: this.formatCurrency(total),
          status: item.status,
          type: 'order',
        };
      });

      // 2. Đặt bàn
      const recentReservations = await Reservation.find()
        .select('full_name phone createdAt status')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();

      const reservationIds = recentReservations.map((r) => r._id);
      const reservationTotals = await ReservationDetail.aggregate([
        { $match: { reservation_id: { $in: reservationIds } } },
        { $group: { _id: '$reservation_id', totalAmount: { $sum: '$total_amount' } } },
      ]);

      const totalMap = new Map(
        reservationTotals.map((item) => [item._id.toString(), item.totalAmount]),
      );

      const formattedReservations = recentReservations.map((item) => {
        const total = totalMap.get(item._id.toString()) || 0;
        return {
          id: item._id,
          customerName: item.full_name,
          phone: item.phone,
          createdAt: item.createdAt,
          total: this.formatCurrency(total),
          status: item.status,
          type: 'booking',
        };
      });

      // 3. Gộp & sắp xếp
      const merged = [...recentOrders, ...formattedReservations].sort(
        (a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime(),
      );

      return merged;
    } catch (err: any) {
      console.error('[DashboardService] getRecentTransactions error:', err);
      throw new Error('Không thể lấy danh sách giao dịch gần đây');
    }
  }
}

export default new DashboardService();
