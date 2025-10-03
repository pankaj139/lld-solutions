/**ONLINE SHOPPING SYSTEM - Patterns: State, Strategy, Observer, Factory, Singleton, Command*/
const OrderStatus=Object.freeze({PENDING:'pending',CONFIRMED:'confirmed',SHIPPED:'shipped',DELIVERED:'delivered'});
class Product{constructor(productId,name,price,stock){this.productId=productId;this.name=name;this.price=price;this.stock=stock}}
class CartItem{constructor(product,quantity){this.product=product;this.quantity=quantity}}
class ShoppingCart{constructor(){this.items=[]}addItem(product,quantity){this.items.push(new CartItem(product,quantity))}getTotal(){return this.items.reduce((sum,item)=>sum+item.product.price*item.quantity,0)}}
class Order{constructor(orderId,cart){this.orderId=orderId;this.items=[...cart.items];this.total=cart.getTotal();this.status=OrderStatus.PENDING}confirm(){this.status=OrderStatus.CONFIRMED;console.log(`✓ Order ${this.orderId} confirmed - Total: $${this.total.toFixed(2)}`)}}
class ShoppingService{constructor(){if(ShoppingService.instance)return ShoppingService.instance;this.products=new Map();this.orders=new Map();this.orderCounter=0;ShoppingService.instance=this}addProduct(product){this.products.set(product.productId,product)}placeOrder(cart){const orderId=`ORD${String(this.orderCounter).padStart(4,'0')}`;this.orderCounter++;const order=new Order(orderId,cart);order.confirm();this.orders.set(orderId,order);return order}}
function main(){console.log('='.repeat(70));console.log('ONLINE SHOPPING SYSTEM - Demo');console.log('='.repeat(70));const service=new ShoppingService();const product=new Product('P001','Laptop',999.99,10);service.addProduct(product);const cart=new ShoppingCart();cart.addItem(product,1);service.placeOrder(cart);console.log('\n'+'='.repeat(70));console.log('DEMO COMPLETE');console.log('='.repeat(70))}
if(typeof require!=='undefined'&&require.main===module)main();

