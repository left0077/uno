import { Room, GameState, GameAction, Card, Player } from '../../shared/index.js';

/**
 * 游戏模式接口
 * 所有游戏模式（标准、Out等）必须实现此接口
 */
export interface GameMode {
  readonly name: string;
  readonly description: string;
  
  /**
   * 初始化游戏状态
   */
  initialize(room: Room): GameState;
  
  /**
   * 验证动作是否合法
   */
  validateAction(
    state: GameState, 
    action: GameAction, 
    playerId: string
  ): { valid: boolean; error?: string };
  
  /**
   * 执行动作，返回新状态
   */
  executeAction(
    state: GameState, 
    action: GameAction, 
    playerId: string
  ): GameState;
  
  /**
   * 获取玩家当前可执行的动作列表（用于UI提示）
   */
  getAvailableActions(state: GameState, playerId: string): GameAction[];
  
  /**
   * 检查胜利条件
   * @returns 获胜者ID，或null表示游戏继续
   */
  checkWinCondition(state: GameState): string | null;
  
  /**
   * 回合结束时的处理
   */
  onTurnEnd(state: GameState, playerId: string): GameState;
  
  /**
   * 游戏清理（结束或销毁时调用）
   */
  destroy?(): void;
}

/**
 * 动作上下文，用于传递执行过程中的临时数据
 */
export interface ActionContext {
  state: GameState;
  playerId: string;
  action: GameAction;
  // 动作执行过程中可以添加额外信息
  metadata?: Record<string, unknown>;
}

/**
 * 动作处理器接口（用于更细粒度的动作拆分）
 */
export interface ActionHandler {
  readonly type: string;
  canHandle(action: GameAction): boolean;
  validate(ctx: ActionContext): { valid: boolean; error?: string };
  execute(ctx: ActionContext): GameState;
}

/**
 * 组合技（连打）定义
 */
export interface ComboDefinition {
  readonly type: ComboType;
  readonly name: string;
  readonly minCards: number;
  readonly maxCards?: number;
  
  /**
   * 验证选中的牌是否符合组合要求
   */
  validate(cards: Card[]): boolean;
  
  /**
   * 获取组合的效果
   */
  getEffect(state: GameState, cards: Card[], playerId: string): ComboEffect;
}

export type ComboType = 'pair' | 'three' | 'rainbow' | 'straight';

export interface ComboEffect {
  type: 'draw' | 'skip' | 'transfer' | 'none';
  target: 'next' | 'prev' | 'self' | 'chooser';
  value: number;
  // 额外数据，如累积惩罚转移等
  extra?: Record<string, unknown>;
}

/**
 * 游戏模式工厂
 */
export class GameModeFactory {
  private static modes = new Map<string, new () => GameMode>();
  
  static register(name: string, ModeClass: new () => GameMode): void {
    this.modes.set(name, ModeClass);
  }
  
  static create(name: string): GameMode {
    const ModeClass = this.modes.get(name);
    if (!ModeClass) {
      throw new Error(`Unknown game mode: ${name}`);
    }
    return new ModeClass();
  }
  
  static getAvailableModes(): string[] {
    return Array.from(this.modes.keys());
  }
}
