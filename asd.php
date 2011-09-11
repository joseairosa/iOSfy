<?php

class SendEngine extends Core {
	public static $Engine;
	public static $EngineType;
	public static $ArrayTemporaryImageEmbeddingFiles = array();
	public static $EmailHeaderSender;
	public static $EmailHeaderReceiver;
	public static $SendMethod;
	private static $PowerMTAVMTA;
	private static $PowerMTADir;
	private static $SaveToDiskDir;
	public static $XMailer;

	private function __construct() { }

	public static function SetEngine($EngineType, $SendMethod) {
		if ($SendMethod == '') {
			self::$SendMethod = SEND_METHOD;
		} else {
			self::$SendMethod = $SendMethod;
		}
		if ($EngineType == 'phpmailer') {
			Core::LoadObject('phpmailer/class.phpmailer.php');
			if (self::$SendMethod == 'SMTP') {
				Core::LoadObject('phpmailer/class.smtp.php');
			}
			self::$EngineType = 'phpmailer';
			self::$Engine = new PHPMailer();
		} elseif ($EngineType == 'swiftmailer') {
			self::$EngineType = 'swiftmailer';
		} else {
		}
	}

	public static function SetEncoding($encoding) {
		if ($encoding != '8bit' && $encoding != '7bit' && $encoding != 'binary' && $encoding != 'base64' && $encoding != 'quoted-printable')
			return;
		if (self::$EngineType == 'phpmailer')
			self::$Engine->Encoding = $encoding;
	}

	public static function SetSendMethod($SetCustom = false, $SMTPHost = '', $SMTPPort = '', $SMTPSecure = '', $SMTPAuth = '', $SMTPUsername = '', $SMTPPassword = '', $SMTPTimeout = '', $SMTPDebug = '', $SMTPKeepAlive = '', $LocalMTAPath = '', $PowerMTAVMTA = '', $PowerMTADir = '', $SaveToDiskDir = '', $XMailer = '') {
		self::$PowerMTAVMTA = ($SetCustom == false ? SEND_METHOD_POWERMTA_VMTA : $PowerMTAVMTA);
		self::$PowerMTADir = self::CorrectTrailingSlash(($SetCustom == false ? SEND_METHOD_POWERMTA_DIR
					: $PowerMTADir));
		self::$SaveToDiskDir = self::CorrectTrailingSlash(($SetCustom == false ? SEND_METHOD_SAVETODISK_DIR
					: $SaveToDiskDir));
		self::$XMailer = ($SetCustom == false ? X_MAILER : $XMailer);
		if (self::$EngineType == 'phpmailer') {
			if (self::$SendMethod == 'SMTP') {
				self::$Engine->IsSMTP();
				self::$Engine->Host = ($SetCustom == false ? SEND_METHOD_SMTP_HOST : $SMTPHost);
				self::$Engine->Port = ($SetCustom == false ? SEND_METHOD_SMTP_PORT : $SMTPPort);
				self::$Engine->SMTPSecure = ($SetCustom == false ? SEND_METHOD_SMTP_SECURE : $SMTPSecure);
				self::$Engine->SMTPAuth = ($SetCustom == false ? SEND_METHOD_SMTP_AUTH : $SMTPAuth);
				self::$Engine->Username = ($SetCustom == false ? SEND_METHOD_SMTP_USERNAME : $SMTPUsername);
				self::$Engine->Password = ($SetCustom == false ? SEND_METHOD_SMTP_PASSWORD : $SMTPPassword);
				self::$Engine->Timeout = ($SetCustom == false ? SEND_METHOD_SMTP_TIMEOUT : $SMTPTimeout);
				self::$Engine->SMTPDebug = ($SetCustom == false ? SEND_METHOD_SMTP_DEBUG : $SMTPDebug);
				self::$Engine->SMTPKeepAlive = ($SetCustom == false ? SEND_METHOD_SMTP_KEEPALIVE : $SMTPKeepAlive);
			} elseif (self::$SendMethod == 'LocalMTA') {
				self::$Engine->IsQmail();
				self::$Engine->Sendmail = ($SetCustom == false ? SEND_METHOD_LOCALMTA_PATH : $LocalMTAPath);
			} elseif (self::$SendMethod == 'PHPMail') {
				self::$Engine->IsMail();
			} elseif (self::$SendMethod == 'PowerMTA') {
				self::$Engine->Mailer = 'save_to_disk';
			} elseif (self::$SendMethod == 'SaveToDisk') {
				self::$Engine->Mailer = 'save_to_disk';
			}
			self::$Engine->Hostname = (isset($_SERVER['SERVER_NAME']) == false ? EMAIL_DELIVERY_HOSTNAME
					: $_SERVER['SERVER_NAME']);
		}
	}

	public static function SetAttachmentsAndImageEmbedding($ContentType, $HTMLContent, $CampaignID, $EmailID, $UserID, $SubscriberID, $ListID, $ArrayAttachments = array(), $ImageEmedding = false) {
		if (self::$EngineType == 'phpmailer') {
			self::$Engine->ClearAttachments();
			if (($ImageEmedding == true) && (($ContentType == 'HTML') || ($ContentType == 'MultiPart'))) {
				$ArrayImages = Emails::DetectImages($HTMLContent, array(APP_URL . 'track_open.php?'), true);
				$TMPCounter = 0;
				foreach ($ArrayImages[1] as $Index => $EachImageURL) {
					$CID = md5($CampaignID . $EachImageURL);
					$ImageContent = Campaigns::FetchRemoteContent($EachImageURL);
					$ArrayReturn = self::SaveImageToTemporaryFile($ImageContent, DATA_PATH . 'tmp/' . $CID);
					self::$ArrayTemporaryImageEmbeddingFiles[] = $ArrayReturn['SavePath'];
					self::$Engine->AddEmbeddedImage($ArrayReturn['SavePath'], $CID, '', 'base64', $ArrayReturn['mime']);
					unset($ImageContent);
					$HTMLContent = str_replace(array('"' . $ArrayImages[1][$TMPCounter] . '"', "'" . $ArrayImages[1][$TMPCounter] . "'"), "cid:" . $CID, $HTMLContent);
					$TMPCounter++;
				}
			}
			if ($ArrayAttachments != false) {
				foreach ($ArrayAttachments as $Index => $ArrayEachAttachment) {
					self::$Engine->AddAttachment(DATA_PATH . 'attachments/' . md5($ArrayEachAttachment['AttachmentID']), $ArrayEachAttachment['FileName'], 'base64', 'application/octet-stream');
				}
			}
		}
		return $HTMLContent;
	}

	public static function RemoveTemporaryImageEmbeddingFiles() { if (count(self::$ArrayTemporaryImageEmbeddingFiles) > 0) {
		foreach (self::$ArrayTemporaryImageEmbeddingFiles as $EachTemporaryFile) {
			self::DeleteTemporaryImageFile($EachTemporaryFile);
		}
	} }

	public static function SetEmailProperties($FromName, $FromEmail, $ToName, $ToEmail, $ReplyToName, $ReplyToEmail, $ArrayHeaders, $ContentType, $Subject, $HTMLContent, $PlainContent, $AbuseMessageID, $CampaignID, $EmailID, $UserID, $SubscriberID, $ListID) {
		$ReturnPathCode = Core::CryptNumber($CampaignID) . '-' . Core::CryptNumber($SubscriberID) . '-' . Core::CryptNumber($ListID) . '-' . Core::CryptNumber($UserID);
		self::$EmailHeaderSender = str_replace(array('_INSERT:EMAILADDRESS_', '_INSERT:MAILSERVERDOMAIN_'), array($ReturnPathCode, (isset($ArraySendEngineMailServer) == true
																												  ? $ArraySendEngineMailServer['Domain']
																												  : BOUNCE_CATCHALL_DOMAIN)), BOUNCE_EMAILADDRESS);
		self::$EmailHeaderReceiver = $ToEmail;
		if (self::$EngineType == 'phpmailer') {
			self::$Engine->From = $FromEmail;
			self::$Engine->FromName = $FromName;
			self::$Engine->Sender = self::$EmailHeaderSender;
			self::$Engine->AddReplyTo($ReplyToEmail, $ReplyToName);
			self::$Engine->AddAddress($ToEmail, $ToName);
			foreach ($ArrayHeaders as $EachHeader => $EachValue) {
				self::$Engine->AddCustomHeader($EachHeader . ':' . $EachValue);
			}
			if (CENTRALIZED_SENDER_DOMAIN != '') {
				self::$Engine->AddCustomHeader('Sender: ');
			}
			self::$Engine->AddCustomHeader('X-Mailer:' . (self::$XMailer == '' ? X_MAILER : self::$XMailer));
			self::$Engine->AddCustomHeader('X-Complaints-To:' . X_COMPLAINTS_TO);
			$EncryptedQuery = Core::EncryptArrayAsQueryStringAdvanced(array($CampaignID, '', $SubscriberID, $ListID, (isset($EmailID) == true
																			  ? $EmailID : 0), 0));
			self::$Engine->AddCustomHeader('List-Unsubscribe:' . '<' . APP_URL . 'u.php?p=' . $EncryptedQuery . '>');
			self::$Engine->AddCustomHeader('X-MessageID:' . $AbuseMessageID);
			self::$Engine->AddCustomHeader('X-Report-Abuse:' . '<' . X_REPORT_ABUSE_URL . $AbuseMessageID . '>');
			self::$Engine->CharSet = CHARSET;
			self::$Engine->Subject = $Subject;
			if ($ContentType == 'HTML') {
				self::$Engine->IsHTML(true);
				self::$Engine->Body = $HTMLContent;
				self::$Engine->AltBody = '';
			} elseif ($ContentType == 'Plain') {
				self::$Engine->IsHTML(false);
				self::$Engine->Body = $PlainContent;
				self::$Engine->AltBody = '';
			} else {
				self::$Engine->Body = $HTMLContent;
				self::$Engine->AltBody = $PlainContent;
			}
		}
	}

	public static function ClearRecipientCache() { if (self::$EngineType == 'phpmailer') {
		self::$Engine->ClearAddresses();
		self::$Engine->ClearCustomHeaders();
		self::$Engine->ClearAllRecipients();
		self::$Engine->ClearReplyTos();
		self::$Engine->ClearCCs();
		self::$Engine->ClearBCCs();
	} }

	public static function SendEmail($JustReturnEmailContent = false) { if (self::$EngineType == 'phpmailer') {
		if (($EmailContent = self::$Engine->Send()) == false) {
			return array(false, self::$Engine->ErrorInfo);
		} else {
			if ($JustReturnEmailContent == true) {
				return $EmailContent;
			} else {
				if (self::$SendMethod == 'PowerMTA') {
					$PMTAEnvolopeData = 'x-sender: ' . self::$EmailHeaderSender . "\n";
					$PMTAEnvolopeData .= 'x-receiver: ' . self::$EmailHeaderReceiver . "\n";
					$PMTAEnvolopeData .= 'x-virtual-mta: ' . self::$PowerMTAVMTA . "\n";
					$EmailContent = $PMTAEnvolopeData . $EmailContent;
					$FileHandler = fopen(self::$PowerMTADir . rand(100, 999) . rand(100, 999) . rand(100, 999) . rand(1000, 9999) . time(), 'w');
					fwrite($FileHandler, $EmailContent);
					fclose($FileHandler);
				} elseif (self::$SendMethod == 'SaveToDisk') {
					$FileHandler = fopen(self::$SaveToDiskDir . rand(100, 999) . rand(100, 999) . rand(100, 999) . rand(1000, 9999) . time(), 'w');
					fwrite($FileHandler, $EmailContent);
					fclose($FileHandler);
				}
				return array(true);
			}
		}
	} }

	function CorrectTrailingSlash($Path) {
		if ((preg_match('/\/$/', $Path) == false) || (preg_match('', $Path) == 0)) {
			$Path = $Path . '/';
		}
		return $Path;
	}

	public static function CloseConnections() { if (self::$EngineType == 'phpmailer') {
		if ((self::$SendMethod == 'SMTP') && (SEND_METHOD_SMTP_KEEPALIVE == true)) {
			self::$Engine->SmtpClose();
		}
	} }

	public static function SaveImageToTemporaryFile($ImageContent, $SavePath) {
		$FileHandler = fopen($SavePath, 'w');
		fwrite($FileHandler, $ImageContent);
		fclose($FileHandler);
		unset($ImageContent);
		$ArrayImageInfo = getimagesize($SavePath);
		return array_merge(array('SavePath' => $SavePath), $ArrayImageInfo);
	}

	public static function DeleteTemporaryImageFile($TMPFilePath) { unlink($TMPFilePath); }
}
?>