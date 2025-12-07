// TimeScaleManager.ts
import { director, Director } from 'cc';

class TimeScaleManager {
    private _scale = 1.0;
    private _originalTick: Function | null = null;
    private _enabled = false;

    init() {
        if (this._enabled) return;
        this._enabled = true;

        // Lưu tick gốc
        this._originalTick = Director.prototype.tick;

        const self = this;

        // Ghi đè tick
        Director.prototype.tick = function (dt: number, ...args: any[]) {
            dt = dt * self._scale;
            return self._originalTick!.call(this, dt, ...args);
        };
    }

    setScale(scale: number) {
        this._scale = Math.max(0, scale);
    }

    getScale() {
        return this._scale;
    }

    // Slowmotion mượt dần
    async tweenScale(targetScale: number, duration: number) {
        const startScale = this._scale;
        const diff = targetScale - startScale;

        return new Promise<void>((resolve) => {
            const start = performance.now();

            const step = () => {
                const t = (performance.now() - start) / duration / 1000;
                if (t >= 1) {
                    this._scale = targetScale;
                    resolve();
                    return;
                }
                this._scale = startScale + diff * t;
                requestAnimationFrame(step);
            };

            requestAnimationFrame(step);
        });
    }
}

export const TimeScale = new TimeScaleManager();
