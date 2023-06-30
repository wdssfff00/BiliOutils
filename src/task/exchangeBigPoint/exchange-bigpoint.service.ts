import { logger } from '@/utils';
import * as bigPointApi from './exchange-bigpoint.request';

export async function exchangeBigPointService() {}

/**
 * 获取商品列表
 */
async function getSkuList() {
  try {
    const { data, code, message } = await bigPointApi.getSkuList();
    if (code === 0) {
      return data;
    }
    logger.fatal(`获取商品列表`, code, message);
  } catch (error) {
    logger.exception('获取商品列表', error);
  }
}

/**
 * 验证商品是否可兑换
 */
async function verifyOrder(token: string, price: number) {
  try {
    const { data, code, message } = await bigPointApi.verifyOrder(token, price);
    if (code === 0) {
      if (data.can_purchase) {
        return Boolean(data.can_purchase);
      }
      logger.warn(data.reject_reason || '未知错误，不可兑换');
      return false;
    }
    logger.fatal(`验证商品是否可兑换`, code, message);
  } catch (error) {
    logger.exception('验证商品是否可兑换', error);
  }
  return false;
}

/**
 * 创建订单
 * @param token
 * @param price
 */
async function createOrder(token: string, price: number) {
  try {
    const { data, code, message } = await bigPointApi.createOrder(token, price);
    if (code === 0 && data.order) {
      return data.order.order_no;
    }
    logger.fatal(`创建订单`, code, message);
  } catch (error) {
    logger.exception('创建订单', error);
  }
}

/**
 * 支付
 * @param orderNo
 * @param token
 */
async function payOrder(orderNo: string, token: string) {
  try {
    const { code, message, data } = await bigPointApi.paymentOrder(orderNo, token);
    if (code === 0) {
      return data.state;
    }
    logger.fatal(`支付`, code, message);
  } catch (error) {
    logger.exception('支付', error);
  }
  return -999;
}
