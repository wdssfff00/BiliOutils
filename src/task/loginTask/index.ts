import { getNav, getCoinBalance } from '@/net/user-info.request';
import { TaskConfig, TaskModule } from '@/config';
import { apiDelay } from '@/utils';
import type { UserInfoNavDto } from '@/dto/user-info.dto';
import { logger } from '@/utils/log';
import { request } from '@/utils/request';
import Big from 'big.js';

type UserNavData = UserInfoNavDto['data'];

function estimatedDays(upLevelExp: number): number {
  const { targetCoins } = TaskConfig.coin;
  if (targetCoins < 1) return upLevelExp / 15;
  const dailyExp = targetCoins * 10 + 15;
  const idealDays = upLevelExp / dailyExp;
  const coinSupportDays = TaskModule.money.div(targetCoins - 1).toNumber();
  if (idealDays < coinSupportDays) return Math.floor(idealDays);
  const needExp = upLevelExp - coinSupportDays * dailyExp;
  return needExp / 25 + coinSupportDays;
}

function setLevelInfo(data: UserNavData) {
  /** 等级相关信息 */
  const levelInfo = data.level_info;
  const currentLevel = levelInfo.current_level;
  // 判断当前等级是否还需要投币
  if (currentLevel >= TaskConfig.coin.targetLevel && TaskConfig.limit.level6) {
    TaskModule.coinsTask = 0;
  }
  logger.info(`当前等级: ${levelInfo.current_level}`);
  if (currentLevel < 6) {
    const upLevelExp = Number(levelInfo.next_exp) - levelInfo.current_exp;
    // 实际天数肯定会少一些
    logger.info(`距升级还需 ${upLevelExp} 经验，预计 ${estimatedDays(upLevelExp).toFixed(2)} 天`);
    return;
  }
  if (TaskConfig.limit.level6) {
    logger.info('已经满级（关闭部分功能）');
    const funcs = TaskConfig.function;
    funcs.shareAndWatch = false;
    funcs.addCoins = false;
  } else {
    logger.info('已经满级，但要求继续（投币，分享等）');
  }
}

export function setVipStatus(data: UserNavData) {
  TaskModule.vipType = data.vipType;
  TaskModule.vipStatus = data.vipStatus;

  if (data.vip_label.text) {
    logger.info(`大会员状态: ${data.vip_label.text}`);
  }
}

async function setUserInfo(data: UserNavData) {
  try {
    const { money } = await request(getCoinBalance); // 获取更精准的硬币数量

    logger.info(`登录成功: ${data.uname}`);
    logger.info(`硬币余额: ${money || 0}`);
    TaskModule.nickname = data.uname;
    TaskModule.money = Big(money || 0);
    TaskModule.userLevel = data.level_info.current_level;
    TaskModule.couponBalance = data.wallet?.coupon_balance || 0;

    setLevelInfo(data);
    setVipStatus(data);
  } catch (error) {
    logger.error(`获取硬币信息异常: ${error.message}`);
    logger.debug(error);
  }
}

export default async function loginTask() {
  logger.info('----【登录】----');
  const { data, message, code } = await getNav();
  if (code !== 0) {
    logger.error(`[${TaskConfig.USERID}]登录错误 ${code} ${message}`);
    throw new Error(message);
  }
  if (!data.isLogin) {
    throw new Error('接口返回为未登录');
  }
  await apiDelay();
  await setUserInfo(data);
}
