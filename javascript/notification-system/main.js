/**NOTIFICATION SYSTEM - Patterns: Observer, Strategy, Factory, Template Method*/
const NotificationChannel=Object.freeze({EMAIL:'email',SMS:'sms',PUSH:'push'});
class EmailSender{send(recipient,message){console.log(`📧 Email to ${recipient}: ${message}`)}}
class SMSSender{send(recipient,message){console.log(`📱 SMS to ${recipient}: ${message}`)}}
class PushSender{send(recipient,message){console.log(`🔔 Push to ${recipient}: ${message}`)}}
class Notification{constructor(recipient,message,channels){this.recipient=recipient;this.message=message;this.channels=channels}}
class NotificationService{constructor(){if(NotificationService.instance)return NotificationService.instance;this.senders={[NotificationChannel.EMAIL]:new EmailSender(),[NotificationChannel.SMS]:new SMSSender(),[NotificationChannel.PUSH]:new PushSender()};NotificationService.instance=this}send(notification){notification.channels.forEach(channel=>this.senders[channel].send(notification.recipient,notification.message))}}
function main(){console.log('='.repeat(70));console.log('NOTIFICATION SYSTEM - Demo');console.log('='.repeat(70));const service=new NotificationService();const notification=new Notification('user@example.com','Welcome!',[NotificationChannel.EMAIL,NotificationChannel.SMS]);service.send(notification);console.log('\n'+'='.repeat(70));console.log('DEMO COMPLETE');console.log('='.repeat(70))}
if(typeof require!=='undefined'&&require.main===module)main();
