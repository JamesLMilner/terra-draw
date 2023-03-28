export class AdapterListener<Callback extends (...args: any[]) => any> {
	public name: string;
	public callback: (...args: any[]) => any;
	public registered = false;
	public register: any;
	public unregister: any;

	/**
	 * Creates a new AdapterListener instance with the provided configuration.
	 *
	 * @param {Object} config - The configuration object for the listener.
	 * @param {string} config.name - The name of the event listener.
	 * @param {Function} config.callback - The callback function to be called when the event is triggered.
	 * @param {Function} config.unregister - The function to unregister the event listeners.
	 * @param {Function} config.register - The function to register the event listeners.
	 */
	constructor({
		name,
		callback,
		unregister,
		register,
	}: {
		name: string;
		callback: Callback;
		unregister: (callbacks: Callback) => void;
		register: (callback: Callback) => void;
	}) {
		this.name = name;

		// Function to register the event listeners
		this.register = () => {
			if (!this.registered) {
				this.registered = true;
				register(callback);
			}
		};

		// Function to unregister the event listeners
		this.unregister = () => {
			if (this.register) {
				this.registered = false;
				unregister(callback);
			}
		};

		this.callback = callback;
	}
}
